import json
import logging
from typing import Dict, Any

from src.state import CropThreatState
from src.llm_client import llm_invoke
from src.utils.logger import setup_logger

logger = setup_logger(__name__)

SUITABILITY_SYSTEM_PROMPT = (
    "You are a plant pathologist. Given weather data (temperature, humidity, soil moisture) "
    "and a crop-pathogen pair, assess the biophysical suitability for the pathogen to thrive. "
    "Return ONLY valid JSON with this exact structure, no other text:\n"
    '{"suitability_index": 0.0-1.0, "reasoning": "brief explanation", '
    '"temperature_assessment": "favorable|moderate|unfavorable", '
    '"humidity_assessment": "favorable|moderate|unfavorable"}\n'
    "Fungal pathogens favor: 20-30C, >80% humidity, moist soil. "
    "Bacterial pathogens favor: 25-35C, >85% humidity. "
    "Viral pathogens favor: 20-35C, moderate humidity."
)


def _compute_with_formula(state: CropThreatState) -> Dict[str, Any]:
    weather = state.get("weather_data", {})
    current = weather.get("current", {})

    temp = current.get("temperature_2m", 25.0)
    humidity = current.get("relative_humidity_2m", 70.0)
    soil_moisture = current.get("soil_moisture_0_to_7cm", 0.3)

    temp_score = max(0.0, min(1.0, (temp - 5.0) / (30.0 - 5.0)))
    humidity_score = max(0.0, min(1.0, (humidity - 40.0) / (100.0 - 40.0)))
    moisture_score = max(0.0, min(1.0, soil_moisture / 1.0))

    suitability = 0.5 * humidity_score + 0.3 * temp_score + 0.2 * moisture_score
    suitability = round(min(1.0, max(0.0, suitability)), 4)

    return {
        "suitability_index": suitability,
        "suitability_details": {
            "temperature": temp,
            "humidity": humidity,
            "soil_moisture": soil_moisture,
            "temp_score": round(temp_score, 4),
            "humidity_score": round(humidity_score, 4),
            "moisture_score": round(moisture_score, 4),
            "method": "formula",
        },
    }


def _compute_with_llm(state: CropThreatState) -> Dict[str, Any]:
    weather = state.get("weather_data", {})
    current = weather.get("current", {})
    entities = state.get("extracted_entities", [])

    temp = current.get("temperature_2m", "N/A")
    humidity = current.get("relative_humidity_2m", "N/A")
    soil_moisture = current.get("soil_moisture_0_to_7cm", "N/A")

    crop = entities[0].get("crops", ["unknown"])[0] if entities else "unknown"
    pathogen = entities[0].get("pathogens", ["unknown"])[0] if entities else "unknown"

    user_prompt = (
        f"Weather: temp={temp}C, humidity={humidity}%, "
        f"soil_moisture={soil_moisture}\n"
        f"Crop: {crop}\nPathogen: {pathogen}\n\n"
        "Assess biophysical suitability for this pathogen."
    )

    result = llm_invoke(SUITABILITY_SYSTEM_PROMPT, user_prompt)
    if result is None:
        return None

    try:
        parsed = json.loads(result)
        suitability = float(parsed.get("suitability_index", -1))
        if not (0.0 <= suitability <= 1.0):
            raise ValueError(f"suitability_index out of range: {suitability}")

        details = {
            "method": "llm",
            "llm_reasoning": parsed.get("reasoning", ""),
            "temperature_assessment": parsed.get("temperature_assessment", ""),
            "humidity_assessment": parsed.get("humidity_assessment", ""),
        }
        return {"suitability_index": suitability, "suitability_details": details}
    except (json.JSONDecodeError, ValueError, TypeError) as e:
        logger.warning("LLM suitability parse failed (%s), using formula fallback", str(e))
        return None


def compute_suitability_index(state: CropThreatState) -> Dict[str, Any]:
    try:
        result = _compute_with_llm(state)
        if result is None:
            logger.info("LLM suitability unavailable, using formula fallback")
            result = _compute_with_formula(state)

        logger.info("Suitability index computed: %s", result["suitability_index"])
        return {"suitability_index": result["suitability_index"], "suitability_details": result["suitability_details"], "errors": []}
    except Exception as e:
        logger.error("Suitability computation failed: %s", str(e))
        return {"suitability_index": 0.0, "suitability_details": {}, "errors": [str(e)]}
