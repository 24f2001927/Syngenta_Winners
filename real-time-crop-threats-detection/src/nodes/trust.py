import logging
from typing import Dict, Any

from src.state import CropThreatState
from src.config import SOURCE_TRUST_ALPHA
from src.utils.logger import setup_logger

logger = setup_logger(__name__)


def update_source_trust(state: CropThreatState) -> Dict[str, Any]:
    try:
        metadata = state.get("source_metadata", {})
        current_trust = metadata.get("trust_score", 0.5)
        suitability = state.get("suitability_index", 0.0)

        alpha = SOURCE_TRUST_ALPHA
        updated_trust = round(alpha * current_trust + (1 - alpha) * suitability, 4)

        logger.info(
            "Source trust updated: %s -> %s (suitability=%s, alpha=%s)",
            current_trust, updated_trust, suitability, alpha,
        )
        return {"source_trust": updated_trust, "errors": []}
    except Exception as e:
        logger.error("Source trust update failed: %s", str(e))
        return {"source_trust": 0.5, "errors": [str(e)]}
