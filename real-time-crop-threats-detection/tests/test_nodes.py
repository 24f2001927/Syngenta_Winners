from src.state import CropThreatState
from src.nodes.ingestion import ingest_web_streams
from src.nodes.ner_extractor import extract_entities
from src.nodes.suitability import compute_suitability_index
from src.nodes.historical import lookup_historical_prior
from src.nodes.likelihood import compute_likelihood
from src.nodes.trust import update_source_trust
from src.nodes.bayesian import bayesian_fusion
from src.nodes.decision import decision_engine


def _make_state(overrides: dict = None) -> CropThreatState:
    base = CropThreatState(
        raw_texts=[],
        source_metadata={"trust_score": 0.75},
        extracted_entities=[],
        entity_validation_errors=[],
        weather_data={
            "current": {
                "temperature_2m": 26.0,
                "relative_humidity_2m": 85.0,
                "soil_moisture_0_to_7cm": 0.6,
            }
        },
        suitability_index=0.0,
        suitability_details={},
        prior_probability=0.3,
        likelihood=0.0,
        source_trust=0.5,
        posterior_probability=0.0,
        risk_level="LOW",
        prescription={},
        errors=[],
    )
    if overrides:
        base.update(overrides)
    return base


def test_ingestion_returns_texts():
    state = _make_state()
    result = ingest_web_streams(state)
    assert len(result["raw_texts"]) > 0
    assert "source" in result["source_metadata"]


def test_ner_extraction_finds_entities():
    state = _make_state({"raw_texts": ["Wheat blast reported in Jessore district."]})
    result = extract_entities(state)
    assert len(result["extracted_entities"]) > 0


def test_ner_extraction_no_entities_returns_error():
    state = _make_state({"raw_texts": ["Weather is nice today."]})
    result = extract_entities(state)
    assert len(result["entity_validation_errors"]) > 0


def test_suitability_index_range():
    state = _make_state()
    result = compute_suitability_index(state)
    assert 0.0 <= result["suitability_index"] <= 1.0


def test_historical_prior_found():
    state = _make_state({
        "extracted_entities": [{"crops": ["rice"], "pathogens": ["blast"], "regions": []}]
    })
    result = lookup_historical_prior(state)
    assert result["prior_probability"] == 0.45


def test_historical_prior_default():
    state = _make_state()
    result = lookup_historical_prior(state)
    assert result["prior_probability"] == 0.3


def test_likelihood_range():
    state = _make_state()
    result = compute_likelihood(state)
    assert 0.0 <= result["likelihood"] <= 1.0


def test_source_trust_updates():
    state = _make_state({"source_trust": 0.5, "suitability_index": 0.8})
    result = update_source_trust(state)
    assert 0.0 <= result["source_trust"] <= 1.0


def test_bayesian_fusion():
    state = _make_state({
        "prior_probability": 0.45,
        "likelihood": 0.8,
        "source_trust": 0.75,
    })
    result = bayesian_fusion(state)
    assert 0.0 <= result["posterior_probability"] <= 1.0


def test_decision_critical():
    state = _make_state({
        "posterior_probability": 0.90,
        "extracted_entities": [{"crops": ["rice"], "pathogens": ["blast"], "regions": []}],
    })
    result = decision_engine(state)
    assert result["risk_level"] == "CRITICAL"


def test_decision_low():
    state = _make_state({"posterior_probability": 0.10})
    result = decision_engine(state)
    assert result["risk_level"] == "LOW"
