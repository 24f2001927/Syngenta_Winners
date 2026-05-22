import logging
from typing import Dict, Any

from app.threat_module.state import CropThreatState
from app.threat_module.utils.logger import setup_logger

logger = setup_logger(__name__)


def bayesian_fusion(state: CropThreatState) -> Dict[str, Any]:
    try:
        prior = state.get("prior_probability", 0.3)
        likelihood = state.get("likelihood", 0.5)
        source_trust = state.get("source_trust", 0.5)

        prior_complement = 1.0 - prior
        likelihood_complement = 1.0 - likelihood
        trust_complement = 1.0 - source_trust

        numerator = likelihood * prior * source_trust
        denominator = numerator + likelihood_complement * prior_complement * trust_complement

        posterior = numerator / denominator if denominator > 0 else 0.0
        posterior = round(min(1.0, max(0.0, posterior)), 4)

        logger.info(
            "Bayesian fusion: prior=%s, likelihood=%s, trust=%s -> posterior=%s",
            prior, likelihood, source_trust, posterior,
        )
        return {"posterior_probability": posterior, "errors": []}
    except Exception as e:
        logger.error("Bayesian fusion failed: %s", str(e))
        return {"posterior_probability": 0.0, "errors": [str(e)]}
