import operator
from typing import Annotated, TypedDict, List, Dict, Any


class CropThreatState(TypedDict):
    raw_texts: List[str]
    source_metadata: Dict[str, Any]
    extracted_entities: List[Dict[str, Any]]
    entity_validation_errors: Annotated[List[str], operator.add]
    weather_data: Dict[str, Any]
    suitability_index: float
    suitability_details: Dict[str, Any]
    prior_probability: float
    likelihood: float
    source_trust: float
    posterior_probability: float
    risk_level: str
    prescription: Dict[str, Any]
    errors: Annotated[List[str], operator.add]
