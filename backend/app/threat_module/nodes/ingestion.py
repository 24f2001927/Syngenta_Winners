import logging
from typing import Dict, Any, List

from app.threat_module.state import CropThreatState
from app.threat_module.utils.logger import setup_logger

logger = setup_logger(__name__)


def ingest_web_streams(state: CropThreatState) -> Dict[str, Any]:
    try:
        provided = state.get("raw_texts", [])
        if provided:
            logger.info("Using %d provided raw texts", len(provided))
            return {
                "raw_texts": provided,
                "source_metadata": state.get("source_metadata", {}),
                "errors": [],
            }

        logger.info("No provided texts, using mock data")
        raw_texts: List[str] = [
            (
                "Wheat blast outbreak reported in Jessore district, Bangladesh. "
                "Farmers observed rapid spike bleaching. Local agri-extension confirms."
            ),
            (
                "Rice blast detected in Punjab region. High humidity and prolonged "
                "leaf wetness reported. Farmers urged to scout fields immediately."
            ),
        ]
        source_metadata: Dict[str, Any] = {
            "source": "mock-rss-feed",
            "language": "en",
            "published": "2026-05-21",
            "trust_score": 0.75,
        }
        logger.info("Ingested %d raw texts", len(raw_texts))
        return {
            "raw_texts": raw_texts,
            "source_metadata": source_metadata,
            "errors": [],
        }
    except Exception as e:
        logger.error("Ingestion failed: %s", str(e))
        return {"raw_texts": [], "source_metadata": {}, "errors": [str(e)]}
