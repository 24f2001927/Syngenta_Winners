import logging
from typing import Dict, Any

import requests

from app.threat_module.state import CropThreatState
from app.threat_module.config import OPEN_METEO_BASE_URL
from app.threat_module.utils.logger import setup_logger

logger = setup_logger(__name__)

FALLBACK_WEATHER = {
    "current": {
        "temperature_2m": 26.0,
        "relative_humidity_2m": 82.0,
        "soil_moisture_0_to_7cm": 0.45,
    }
}


def fetch_weather_telemetry(state: CropThreatState) -> Dict[str, Any]:
    try:
        entities = state.get("extracted_entities", [])
        if not entities:
            lat, lon = 23.0, 89.0
        else:
            lat, lon = 23.0, 89.0

        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,soil_moisture_0_to_7cm",
            "timezone": "auto",
            "forecast_days": 1,
        }

        logger.info("Fetching weather for lat=%s, lon=%s", lat, lon)
        resp = requests.get(OPEN_METEO_BASE_URL, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        weather_data = {
            "latitude": lat,
            "longitude": lon,
            "current": data.get("current", {}),
        }
        logger.info("Weather telemetry fetched successfully")
        return {"weather_data": weather_data, "errors": []}

    except requests.RequestException as e:
        logger.warning("Weather API call failed, using fallback: %s", str(e))
        return {"weather_data": dict(FALLBACK_WEATHER), "errors": []}
    except Exception as e:
        logger.warning("Weather node failed, using fallback: %s", str(e))
        return {"weather_data": dict(FALLBACK_WEATHER), "errors": []}
