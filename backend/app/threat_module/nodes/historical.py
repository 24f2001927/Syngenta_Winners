import logging
from typing import Dict, Any

from app.threat_module.state import CropThreatState
from app.threat_module.utils.logger import setup_logger

logger = setup_logger(__name__)

HISTORICAL_PRIORS: Dict[str, float] = {
    "rice_blast": 0.45,
    "wheat_blast": 0.30,
    "potato_blight": 0.55,
    "maize_rust": 0.25,
    "grape_mildew": 0.40,
}


def lookup_historical_prior(state: CropThreatState) -> Dict[str, Any]:
    try:
        entities = state.get("extracted_entities", [])
        if not entities:
            logger.warning("No entities for historical prior; using default 0.3")
            return {"prior_probability": 0.3, "errors": []}

        prior = 0.3
        for ent in entities:
            for pathogen in ent.get("pathogens", []):
                for crop in ent.get("crops", []):
                    key = f"{crop}_{pathogen}"
                    if key in HISTORICAL_PRIORS:
                        prior = max(prior, HISTORICAL_PRIORS[key])

        logger.info("Historical prior probability: %s", prior)
        return {"prior_probability": prior, "errors": []}
    except Exception as e:
        logger.error("Historical prior lookup failed: %s", str(e))
        return {"prior_probability": 0.3, "errors": [str(e)]}
