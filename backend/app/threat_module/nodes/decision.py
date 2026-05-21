import json
import logging
from typing import Dict, Any

from app.threat_module.state import CropThreatState
from app.threat_module.config import (
    HIGH_CONFIDENCE_THRESHOLD,
    MODERATE_CONFIDENCE_THRESHOLD,
    LOW_CONFIDENCE_THRESHOLD,
)
from app.threat_module.llm_client import llm_invoke
from app.threat_module.utils.logger import setup_logger

logger = setup_logger(__name__)

PRESCRIPTION_SYSTEM_PROMPT = (
    "You are an expert agronomist. Given a crop, disease/pathogen, region, "
    "confidence level, and risk level, generate a specific actionable "
    "mitigation prescription. "
    "Return ONLY valid JSON with this exact structure, no other text:\n"
    '{"action": "full_mitigation|advisory|monitor|discard", '
    '"message": "brief farmer-friendly advisory in plain English (1-2 sentences)", '
    '"specific_product": "recommended product name or None if unavailable", '
    '"application_instructions": "brief dosage or timing advice or empty string", '
    '"preventive_measures": "short actionable tip or empty string"}\n'
    "Be specific, practical, and reference real agricultural products when possible."
)


def _generate_with_rules(
    posterior: float, crop_names: list, risk_level: str
) -> Dict[str, Any]:
    if posterior >= HIGH_CONFIDENCE_THRESHOLD:
        return {
            "action": "full_mitigation",
            "irrigation_lockout": True,
            "drone_spray": True,
            "sms_alert": True,
            "fertigation_adjustment": {"nitrogen_reduce": True, "potassium_boost": True},
            "message": (
                f"CRITICAL: {posterior:.0%} verified threat on {', '.join(crop_names)}. "
                "Automated mitigation triggered."
            ),
        }
    elif posterior >= MODERATE_CONFIDENCE_THRESHOLD:
        return {
            "action": "advisory",
            "irrigation_lockout": False,
            "drone_spray": False,
            "sms_alert": True,
            "fertigation_adjustment": None,
            "message": (
                f"ADVISORY: {posterior:.0%} probability of {', '.join(crop_names)} threat. "
                "Scout fields and prepare mitigation."
            ),
        }
    elif posterior >= LOW_CONFIDENCE_THRESHOLD:
        return {
            "action": "monitor",
            "message": (
                f"MONITOR: {posterior:.0%} probability. "
                "Continue regular observation."
            ),
        }
    else:
        return {
            "action": "discard",
            "message": "Low confidence threat — discarded.",
        }


def _generate_with_llm(
    posterior: float, crop_names: list, pathogens: list, region: str, risk_level: str
) -> Dict[str, Any]:
    user_prompt = (
        f"Crop(s): {', '.join(crop_names)}\n"
        f"Pathogen(s): {', '.join(pathogens) if pathogens else 'unknown'}\n"
        f"Region: {region or 'unknown'}\n"
        f"Confidence: {posterior:.0%}\n"
        f"Risk Level: {risk_level}\n\n"
        "Generate a mitigation prescription."
    )

    result = llm_invoke(PRESCRIPTION_SYSTEM_PROMPT, user_prompt)
    if result is None:
        return None

    try:
        parsed = json.loads(result)
        if not isinstance(parsed, dict) or "action" not in parsed:
            raise ValueError("Missing 'action' key")

        action = parsed["action"]
        llm_message = parsed.get("message", "")

        base = {
            "action": action,
            "message": llm_message,
            "llm_generated": True,
        }

        if parsed.get("specific_product"):
            base["specific_product"] = parsed["specific_product"]
        if parsed.get("application_instructions"):
            base["application_instructions"] = parsed["application_instructions"]
        if parsed.get("preventive_measures"):
            base["preventive_measures"] = parsed["preventive_measures"]

        if action == "full_mitigation":
            base["irrigation_lockout"] = True
            base["drone_spray"] = True
            base["sms_alert"] = True
            base["fertigation_adjustment"] = {"nitrogen_reduce": True, "potassium_boost": True}

        return base
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning("LLM prescription parse failed (%s), using rule fallback", str(e))
        return None


def decision_engine(state: CropThreatState) -> Dict[str, Any]:
    try:
        posterior = state.get("posterior_probability", 0.0)
        entities = state.get("extracted_entities", [])
        crop_names = entities[0].get("crops", ["unknown"]) if entities else ["unknown"]
        pathogens = entities[0].get("pathogens", []) if entities else []
        region = next(iter(entities[0].get("regions", [])), None) if entities else None

        if posterior >= HIGH_CONFIDENCE_THRESHOLD:
            risk_level = "CRITICAL"
        elif posterior >= MODERATE_CONFIDENCE_THRESHOLD:
            risk_level = "HIGH"
        elif posterior >= LOW_CONFIDENCE_THRESHOLD:
            risk_level = "MODERATE"
        else:
            risk_level = "LOW"

        prescription = _generate_with_llm(
            posterior, crop_names, pathogens, region, risk_level
        )
        if prescription is None:
            logger.info("LLM prescription unavailable, using rule-based fallback")
            prescription = _generate_with_rules(posterior, crop_names, risk_level)

        logger.info("Decision: risk_level=%s, posterior=%s", risk_level, posterior)
        return {"risk_level": risk_level, "prescription": prescription, "errors": []}
    except Exception as e:
        logger.error("Decision engine failed: %s", str(e))
        return {"risk_level": "LOW", "prescription": {}, "errors": [str(e)]}
