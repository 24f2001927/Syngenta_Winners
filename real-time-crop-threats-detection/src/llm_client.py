import logging
import threading
from typing import Optional

import requests

from src.config import (
    NVIDIA_API_KEY,
    NVIDIA_MODEL,
    LLM_ENABLED,
    LLM_REQUEST_TIMEOUT,
)
from src.utils.logger import setup_logger

logger = setup_logger(__name__)

_client = None
_client_available = None
_lock = threading.Lock()


def _validate_api_key() -> bool:
    try:
        resp = requests.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            json={
                "model": "meta/llama-3.1-8b-instruct",
                "messages": [{"role": "user", "content": "ping"}],
                "max_tokens": 1,
            },
            headers={
                "Authorization": f"Bearer {NVIDIA_API_KEY}",
                "Content-Type": "application/json",
            },
            timeout=5,
        )
        if resp.status_code == 401:
            logger.warning("NVIDIA API key is invalid (401)")
            return False
        if resp.status_code == 200:
            return True
        logger.warning("NVIDIA API probe returned %s", resp.status_code)
        return False
    except requests.Timeout:
        logger.warning("NVIDIA API timed out, disabling LLM")
        return False
    except requests.RequestException as e:
        logger.warning("NVIDIA API unreachable (%s)", str(e))
        return False


def get_llm():
    global _client, _client_available

    with _lock:
        if _client_available is False:
            return None
        if _client is not None:
            return _client

        if not LLM_ENABLED:
            logger.info("LLM disabled via config")
            _client_available = False
            return None

        if not _validate_api_key():
            _client_available = False
            return None

        try:
            from langchain_nvidia_ai_endpoints import ChatNVIDIA

            _client = ChatNVIDIA(
                model=NVIDIA_MODEL,
                api_key=NVIDIA_API_KEY,
                temperature=0.7,
                top_p=0.9,
                max_tokens=2048,
            )
            logger.info("NVIDIA LLM client initialized (model=%s)", NVIDIA_MODEL)
            _client_available = True
            return _client
        except ImportError:
            logger.warning("langchain-nvidia-ai-endpoints not installed")
            _client_available = False
            return None
        except Exception as e:
            logger.warning("Failed to initialize NVIDIA LLM: %s", str(e))
            _client_available = False
            return None


def llm_invoke(system_prompt: str, user_prompt: str) -> Optional[str]:
    client = get_llm()
    if client is None:
        return None
    try:
        import concurrent.futures

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(client.invoke, messages)
            try:
                response = future.result(timeout=LLM_REQUEST_TIMEOUT)
            except concurrent.futures.TimeoutError:
                logger.warning("LLM request timed out after %ss", LLM_REQUEST_TIMEOUT)
                return None

        content = response.content.strip() if response and response.content else None
        logger.debug("LLM response received (%d chars)", len(content or ""))
        return content
    except Exception as e:
        logger.error("LLM invocation failed: %s", str(e))
        return None
