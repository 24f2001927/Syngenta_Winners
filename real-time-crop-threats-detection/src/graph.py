import logging
from typing import Literal

from langgraph.graph import StateGraph, START, END

from src.state import CropThreatState
from src.nodes.ingestion import ingest_web_streams
from src.nodes.ner_extractor import extract_entities
from src.nodes.weather import fetch_weather_telemetry
from src.nodes.suitability import compute_suitability_index
from src.nodes.historical import lookup_historical_prior
from src.nodes.likelihood import compute_likelihood
from src.nodes.trust import update_source_trust
from src.nodes.bayesian import bayesian_fusion
from src.nodes.decision import decision_engine
from src.config import (
    HIGH_CONFIDENCE_THRESHOLD,
    MODERATE_CONFIDENCE_THRESHOLD,
    LOW_CONFIDENCE_THRESHOLD,
)
from src.utils.logger import setup_logger

logger = setup_logger(__name__)


def route_by_confidence(
    state: CropThreatState,
) -> Literal["LOW", "MODERATE", "HIGH", "CRITICAL"]:
    posterior = state.get("posterior_probability", 0.0)
    if posterior >= HIGH_CONFIDENCE_THRESHOLD:
        return "CRITICAL"
    elif posterior >= MODERATE_CONFIDENCE_THRESHOLD:
        return "HIGH"
    elif posterior >= LOW_CONFIDENCE_THRESHOLD:
        return "MODERATE"
    return "LOW"


def build_graph() -> StateGraph:
    logger.info("Building LangGraph graph")

    builder = StateGraph(CropThreatState)

    builder.add_node("ingest_web_streams", ingest_web_streams)
    builder.add_node("extract_entities", extract_entities)
    builder.add_node("fetch_weather_telemetry", fetch_weather_telemetry)
    builder.add_node("compute_suitability_index", compute_suitability_index)
    builder.add_node("lookup_historical_prior", lookup_historical_prior)
    builder.add_node("compute_likelihood", compute_likelihood)
    builder.add_node("update_source_trust", update_source_trust)
    builder.add_node("bayesian_fusion", bayesian_fusion)
    builder.add_node("decision_engine", decision_engine)

    builder.add_edge(START, "ingest_web_streams")
    builder.add_edge("ingest_web_streams", "extract_entities")

    builder.add_edge("extract_entities", "fetch_weather_telemetry")
    builder.add_edge("fetch_weather_telemetry", "compute_suitability_index")

    builder.add_edge("compute_suitability_index", "lookup_historical_prior")
    builder.add_edge("compute_suitability_index", "compute_likelihood")
    builder.add_edge("compute_suitability_index", "update_source_trust")

    builder.add_edge(["lookup_historical_prior", "compute_likelihood", "update_source_trust"], "bayesian_fusion")

    builder.add_edge("bayesian_fusion", "decision_engine")

    builder.add_conditional_edges(
        "decision_engine",
        route_by_confidence,
        {
            "CRITICAL": END,
            "HIGH": END,
            "MODERATE": END,
            "LOW": END,
        },
    )

    logger.info("Graph built successfully")
    return builder.compile()


def create_initial_state() -> CropThreatState:
    return CropThreatState(
        raw_texts=[],
        source_metadata={},
        extracted_entities=[],
        entity_validation_errors=[],
        weather_data={},
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
