from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.threat_module.graph import build_graph, create_initial_state

router = APIRouter(prefix="/threat", tags=["threat-detection"])


class ThreatCheckRequest(BaseModel):
    raw_text: str
    source_trust: float = 0.75
    source_name: str = "api"
    language: str = "en"


class ThreatCheckResponse(BaseModel):
    risk_level: str
    posterior_probability: float
    suitability_index: float
    likelihood: float
    prior_probability: float
    source_trust: float
    prescription: dict
    crop: Optional[str] = None
    pathogen: Optional[str] = None
    region: Optional[str] = None


@router.post("/check", response_model=ThreatCheckResponse)
def check_threat(req: ThreatCheckRequest):
    try:
        graph = build_graph()
        state = create_initial_state()

        state["raw_texts"] = [req.raw_text]
        state["source_metadata"] = {
            "source": req.source_name,
            "language": req.language,
            "trust_score": req.source_trust,
        }

        result = graph.invoke(state)

        entities = result.get("extracted_entities", [])
        crop = entities[0].get("crops", [None])[0] if entities else None
        pathogen = entities[0].get("pathogens", [None])[0] if entities else None
        region = entities[0].get("regions", [None])[0] if entities else None

        return ThreatCheckResponse(
            risk_level=result.get("risk_level", "LOW"),
            posterior_probability=result.get("posterior_probability", 0.0),
            suitability_index=result.get("suitability_index", 0.0),
            likelihood=result.get("likelihood", 0.0),
            prior_probability=result.get("prior_probability", 0.0),
            source_trust=result.get("source_trust", 0.0),
            prescription=result.get("prescription", {}),
            crop=crop,
            pathogen=pathogen,
            region=region,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assess", response_model=List[dict])
def assess_threats(req: list[dict]):
    results = []
    graph = build_graph()

    for item in req:
        grower = item.get("grower", {})
        crop = grower.get("crop", item.get("campaign_crop", "unknown"))
        state = create_initial_state()
        state["raw_texts"] = [
            f"{crop} threat reported in {grower.get('state', 'unknown')}."
        ]
        state["source_metadata"] = {"trust_score": 0.75, "source": "campaign-batch"}

        result = graph.invoke(state)

        results.append({
            "grower_id": grower.get("grower_id"),
            "risk_level": result.get("risk_level"),
            "confidence": result.get("posterior_probability"),
            "prescription": result.get("prescription"),
        })

    return results
