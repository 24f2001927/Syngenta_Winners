import os
from dotenv import load_dotenv

load_dotenv()

OPEN_METEO_BASE_URL = os.getenv(
    "OPEN_METEO_BASE_URL", "https://api.open-meteo.com/v1/forecast"
)
NASA_POWER_BASE_URL = os.getenv(
    "NASA_POWER_BASE_URL", "https://power.larc.nasa.gov/api/temporal/daily/point"
)

SOURCE_TRUST_ALPHA = float(os.getenv("SOURCE_TRUST_ALPHA", "0.7"))
HIGH_CONFIDENCE_THRESHOLD = float(os.getenv("HIGH_CONFIDENCE_THRESHOLD", "0.85"))
MODERATE_CONFIDENCE_THRESHOLD = float(os.getenv("MODERATE_CONFIDENCE_THRESHOLD", "0.60"))
LOW_CONFIDENCE_THRESHOLD = float(os.getenv("LOW_CONFIDENCE_THRESHOLD", "0.30"))

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "meta/llama-3.1-8b-instruct")
LLM_ENABLED = os.getenv("LLM_ENABLED", "auto").lower()
if LLM_ENABLED == "auto":
    LLM_ENABLED = bool(NVIDIA_API_KEY)
else:
    LLM_ENABLED = LLM_ENABLED in ("true", "1", "yes")
LLM_REQUEST_TIMEOUT = int(os.getenv("LLM_REQUEST_TIMEOUT", "10"))
LLM_CONNECT_TIMEOUT = int(os.getenv("LLM_CONNECT_TIMEOUT", "5"))

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = os.getenv(
    "LOG_FORMAT", "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
