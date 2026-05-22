import json
import logging
from typing import Dict, Any

from src.state import CropThreatState
from src.llm_client import llm_invoke
from src.utils.logger import setup_logger

logger = setup_logger(__name__)

LIKELIHOOD_SYSTEM_PROMPT = (
    "You are a plant epidemiologist. Given weather conditions and a pathogen, "
    "estimate the likelihood P(W_t | D_active) that the current weather pattern "
    "supports active pathogen development. "
    "Return ONLY valid JSON with this exact structure, no other text:\n"
    '{"likelihood": 0.0-1.0, "reasoning": "brief explanation"}\n'
    "High likelihood (>0.7) if conditions are near-optimal for the pathogen. "
    "Moderate (0.3-0.7) if conditions are suboptimal but possible. "
    "Low (<0.3) if conditions suppress the pathogen."
)


def _compute_with_formula(state: CropThreatState) -> Dict[str, Any]:
    weather = state.get("weather_data", {})
    current = weather.get("current", {})

    temp = current.get("temperature_2m", 25.0)
    humidity = current.get("relative_humidity_2m", 70.0)

    temp_optimal = 1.0 / (1.0 + abs(temp - 22.0) / 10.0)
    humidity_optimal = 1.0 / (1.0 + abs(humidity - 85.0) / 15.0)
    likelihood = round(0.6 * humidity_optimal + 0.4 * temp_optimal, 4)

    return {"likelihood": likelihood}


def _compute_with_llm(state: CropThreatState) -> Dict[str, Any]:
    weather = state.get("weather_data", {})
    current = weather.get("current", {})
    entities = state.get("extracted_entities", [])

    temp = current.get("temperature_2m", "N/A")
    humidity = current.get("relative_humidity_2m", "N/A")
    pathogen = entities[0].get("pathogens", ["unknown"])[0] if entities else "unknown"

    user_prompt = (
        f"Weather: temp={temp}C, humidity={humidity}%\n"
        f"Pathogen: {pathogen}\n\n"
        "Estimate the likelihood of active pathogen development."
    )

    result = llm_invoke(LIKELIHOOD_SYSTEM_PROMPT, user_prompt)
    if result is None:
        return None

    try:
        parsed = json.loads(result)
        likelihood = float(parsed.get("likelihood", -1))
        if not (0.0 <= likelihood <= 1.0):
            raise ValueError(f"likelihood out of range: {likelihood}")

        return {"likelihood": round(likelihood, 4)}
    except (json.JSONDecodeError, ValueError, TypeError) as e:
        logger.warning("LLM likelihood parse failed (%s), using formula fallback", str(e))
        return None


def compute_likelihood(state: CropThreatState) -> Dict[str, Any]:
    try:
        result = _compute_with_llm(state)
        if result is None:
            logger.info("LLM likelihood unavailable, using formula fallback")
            result = _compute_with_formula(state)

        logger.info("Likelihood computed: %s", result["likelihood"])
        return {"likelihood": result["likelihood"], "errors": []}
    except Exception as e:
        logger.error("Likelihood computation failed: %s", str(e))
        return {"likelihood": 0.0, "errors": [str(e)]}
