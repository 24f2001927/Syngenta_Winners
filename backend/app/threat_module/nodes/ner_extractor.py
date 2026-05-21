import json
import logging
import re
from typing import Dict, Any, List

from app.threat_module.state import CropThreatState
from app.threat_module.llm_client import llm_invoke
from app.threat_module.utils.logger import setup_logger

logger = setup_logger(__name__)

CROP_KEYWORDS = {
    "wheat", "rice", "potato", "maize", "corn", "tomato", "grape", "soybean"
}
DISEASE_KEYWORDS = {
    "blast", "blight", "rust", "mildew", "wilt", "rot", "spot", "smut"
}
REGION_PATTERN = re.compile(
    r"\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b"
)

NER_SYSTEM_PROMPT = (
    "You are an agricultural NER system. Extract crop names, diseases/pathogens, "
    "and geographic regions from the given text. "
    "Return ONLY valid JSON with this exact structure, no other text:\n"
    '{"crops": ["crop1", "crop2"], "pathogens": ["disease1"], "regions": ["region1"]}\n'
    "If nothing is found, return empty arrays. "
    "Recognize regional crop names and common misspellings."
)


def _extract_with_keywords(text: str) -> Dict[str, Any]:
    text_lower = text.lower()
    crops_found = {c for c in CROP_KEYWORDS if c in text_lower}
    diseases_found = {d for d in DISEASE_KEYWORDS if d in text_lower}
    regions_found = REGION_PATTERN.findall(text)

    return {
        "crops": list(crops_found),
        "pathogens": list(diseases_found),
        "regions": regions_found,
    }


def _extract_with_llm(text: str) -> Dict[str, Any]:
    result = llm_invoke(NER_SYSTEM_PROMPT, f"Extract entities from: {text}")
    if result is None:
        logger.info("LLM NER unavailable, falling back to keyword extraction")
        return None

    try:
        parsed = json.loads(result)
        if not isinstance(parsed, dict):
            raise ValueError("LLM did not return a JSON object")
        crops = parsed.get("crops", [])
        pathogens = parsed.get("pathogens", [])
        regions = parsed.get("regions", [])
        if isinstance(crops, list) and isinstance(pathogens, list) and isinstance(regions, list):
            return {
                "crops": [str(c).lower() for c in crops],
                "pathogens": [str(p).lower() for p in pathogens],
                "regions": [str(r) for r in regions],
            }
        logger.warning("LLM NER returned unexpected types, using keyword fallback")
        return None
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning("LLM NER parse failed (%s), using keyword fallback", str(e))
        return None


def extract_entities(state: CropThreatState) -> Dict[str, Any]:
    try:
        raw_texts = state.get("raw_texts", [])
        extracted: List[Dict[str, Any]] = []
        errors: List[str] = []
        llm_used = False

        for text in raw_texts:
            try:
                entities = _extract_with_llm(text)
                if entities is not None:
                    llm_used = True
                else:
                    entities = _extract_with_keywords(text)

                if not entities["crops"] or not entities["pathogens"]:
                    errors.append(f"No crop/disease entities found in: {text[:80]}")
                    continue

                entities["source_text"] = text
                extracted.append(entities)
            except Exception as e:
                errors.append(f"Entity extraction error: {str(e)}")

        method = "LLM" if llm_used else "keyword"
        logger.info(
            "Extracted %d entity groups (%s), %d errors",
            len(extracted), method, len(errors),
        )
        return {
            "extracted_entities": extracted,
            "entity_validation_errors": errors,
        }
    except Exception as e:
        logger.error("NER node failed: %s", str(e))
        return {
            "extracted_entities": [],
            "entity_validation_errors": [str(e)],
        }
