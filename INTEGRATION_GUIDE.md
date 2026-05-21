# Integration Guide: Crop Threat Detection → Syngenta AI Marketing Platform

This document explains how to integrate the **Real-Time Crop Threat Detection** engine into the existing **Syngenta AI Marketing Platform** (FastAPI backend + Next.js frontend) to enable pest-aware, context-driven campaign generation.

## Overview

The integration adds three new capabilities to the marketing platform:

1. **`POST /api/v1/threat/check`** — Query live threat risk for a specific grower's location and crop
2. **`POST /api/v1/threat/assess`** — Batch-assess threat risk across multiple growers for campaign targeting
3. **Auto-enriched pest context** — The existing `POST /generate` endpoint automatically pulls live threat data into generated messages

The threat detection module optionally reuses your existing **NVIDIA API key** (`NVIDIA_API_KEY` in your `backend/.env`) to power LLM-based NER, suitability reasoning, likelihood estimation, and prescription generation. If the key is absent or unreachable, every node falls back to deterministic formulas — no code changes needed.

## Architecture

```
                       ┌───────────────────────────────────┐
                       │      Existing FastAPI Backend      │
                       │      (backend/app/)                │
                       │                                    │
  [Frontend] ──────►   │  main.py                           │
                       │  ai_generator.py ← ─ ─ shares ─ ─ │
                       │  predictor.py          NVIDIA key  │
                       │  data_loader.py                    │
                       │                                    │
                       │  ┌───────────────────────────┐     │
                       │  │ threat_module/             │     │
                       │  │  (copied from this repo)   │     │
                       │  │  llm_client.py ←─ uses ─── │     │
                       │  │  the same NVIDIA_API_KEY   │     │
                       │  └──────────┬────────────────┘     │
                       │             │                      │
                       └─────────────┼──────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                 │
                    ▼                ▼                 ▼
              [Open-Meteo]    [Historical DB]    [LangGraph State]
              (live weather)  (prior probs)      (Bayesian fusion)
```

## Step 1: Copy Threat Detection Module into Backend

```bash
# From the crop-threat-detection project
cp -r src/ /path/to/syngenta-backend/app/threat_module/
cp requirements.txt /path/to/syngenta-backend/
```

The backend project structure becomes:

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # Existing FastAPI app
│   ├── ai_generator.py            # Existing LLM generator
│   ├── predictor.py               # Existing receptivity predictor
│   ├── data_loader.py             # Existing data loader
│   └── threat_module/             # NEW - copied from crop-threat-detector
│       ├── __init__.py
│       ├── state.py
│       ├── config.py
│       ├── graph.py
│       ├── llm_client.py          # NVIDIA LLM client (reuses your API key)
│       ├── main.py
│       ├── nodes/
│       │   ├── ingestion.py
│       │   ├── ner_extractor.py   # LLM NER → keyword fallback
│       │   ├── weather.py
│       │   ├── suitability.py     # LLM reasoning → formula fallback
│       │   ├── historical.py
│       │   ├── likelihood.py      # LLM reasoning → formula fallback
│       │   ├── trust.py
│       │   ├── bayesian.py
│       │   └── decision.py        # LLM prescription → rule fallback
│       └── utils/
│           └── logger.py
├── requirements.txt               # Add: langgraph, langchain-nvidia-ai-endpoints
└── .env                           # Your existing NVIDIA_API_KEY is reused
```

## Step 2: Update Dependencies

Add to `backend/requirements.txt`:

```
langgraph>=0.3.0
python-dotenv>=1.0.0
langchain-nvidia-ai-endpoints>=1.0.0
```

## Step 3: No New Env Vars Needed

The threat module automatically reads the **existing** `NVIDIA_API_KEY` from your `backend/.env`. If it's present, the LLM-powered nodes activate. If absent, every node falls back to deterministic logic.

Optional overrides you can add to `.env`:

```ini
# Threat Detection Config (all have sensible defaults)
SOURCE_TRUST_ALPHA=0.7
HIGH_CONFIDENCE_THRESHOLD=0.85
MODERATE_CONFIDENCE_THRESHOLD=0.60
LOW_CONFIDENCE_THRESHOLD=0.30
OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1/forecast
NVIDIA_MODEL=meta/llama-3.1-8b-instruct
LLM_ENABLED=auto
LLM_REQUEST_TIMEOUT=10
```

## Step 4: Register Threat Routes in FastAPI

Create `backend/app/threat_module/routes.py`:

```python
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


class ThreatAssessRequest(BaseModel):
    growers: List[dict]
    campaign_crop: str


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
def assess_threats(req: ThreatAssessRequest):
    results = []
    graph = build_graph()

    for grower in req.growers:
        crop = grower.get("crop", req.campaign_crop)
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
```

## Step 5: Register Router in Main App

In `backend/app/main.py`:

```python
from app.threat_module.routes import router as threat_router

app = FastAPI()
app.include_router(threat_router, prefix="/api/v1")
```

## Step 6: Auto-Enrich Campaign Messages with Live Threat Data

Modify `backend/app/ai_generator.py` to inject threat context before calling the LLM.

First, create a helper:

```python
# backend/app/threat_module/enricher.py

from app.threat_module.graph import build_graph, create_initial_state


def get_threat_context(grower: dict, campaign_crop: str) -> dict:
    graph = build_graph()
    state = create_initial_state()

    state["raw_texts"] = [
        f"{campaign_crop} growing in {grower.get('state', '')} "
        f"district {grower.get('district', '')}."
    ]
    state["source_metadata"] = {"trust_score": 0.75}

    result = graph.invoke(state)

    # When LLM is active, these come from the NVIDIA model;
    # when LLM is unavailable, they come from keyword/regex fallback
    entities = result.get("extracted_entities", [])
    pathogen = (
        entities[0].get("pathogens", ["unknown"])[0]
        if entities
        else "unknown"
    )

    return {
        "risk_level": result.get("risk_level", "LOW"),
        "confidence": result.get("posterior_probability", 0.0),
        "pathogen": pathogen,
        "prescription_action": result.get("prescription", {}).get("action", "none"),
        "llm_generated": result.get("prescription", {}).get("llm_generated", False),
    }
```

Then integrate into the message generation flow:

```python
# Inside ai_generator.py, modify generate_message()

from app.threat_module.enricher import get_threat_context

async def generate_message(grower_data, campaign_goal, product_name, language):
    threat = get_threat_context(grower_data, campaign_goal.get("target_crop", ""))

    pest_context = {
        "threats": [threat["pathogen"]] if threat["pathogen"] != "unknown" else [],
        "severity": "high" if threat["risk_level"] in ("CRITICAL", "HIGH") else "low",
        "confidence": threat["confidence"],
    }

    prompt = build_prompt(
        grower_data=grower_data,
        campaign_goal=campaign_goal,
        product_name=product_name,
        language=language,
        pest_context=pest_context,  # Now live, not static
    )

    return await call_llm(prompt)
```

## Step 7: Add Frontend UI for Threat Data

In `frontend/src/app/page.tsx`, add a threat panel:

```tsx
interface ThreatData {
  risk_level: string;
  posterior_probability: number;
  crop: string;
  pathogen: string;
}

function ThreatPanel({ growerId, crop }: { growerId: string; crop: string }) {
  const [threat, setThreat] = useState<ThreatData | null>(null);

  useEffect(() => {
    fetch("/api/v1/threat/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raw_text: `${crop} report for grower ${growerId}`,
        source_trust: 0.75,
      }),
    })
      .then((r) => r.json())
      .then(setThreat);
  }, [growerId, crop]);

  if (!threat) return <div>Loading threat data...</div>;

  const colorMap: Record<string, string> = {
    CRITICAL: "bg-red-600",
    HIGH: "bg-orange-500",
    MODERATE: "bg-yellow-400",
    LOW: "bg-green-500",
  };

  return (
    <div className={`p-4 rounded-lg text-white ${colorMap[threat.risk_level]}`}>
      <h3 className="font-bold">Threat Risk: {threat.risk_level}</h3>
      <p>Confidence: {(threat.posterior_probability * 100).toFixed(0)}%</p>
      <p>Pathogen: {threat.pathogen || "N/A"}</p>
      <p>Crop: {threat.crop || "N/A"}</p>
    </div>
  );
}
```

## API Reference (New Endpoints)

### `POST /api/v1/threat/check`

Check threat risk for a single report or grower.

**Request:**
```json
{
  "raw_text": "Wheat rust reported in Punjab fields with high humidity",
  "source_trust": 0.85,
  "source_name": "farmer-report",
  "language": "en"
}
```

**Response (LLM active):**
```json
{
  "risk_level": "HIGH",
  "posterior_probability": 0.82,
  "suitability_index": 0.20,
  "likelihood": 0.80,
  "prior_probability": 0.45,
  "source_trust": 0.59,
  "prescription": {
    "action": "full_mitigation",
    "message": "CRITICAL: 82% verified threat on wheat. Automated mitigation triggered.",
    "llm_generated": true
  },
  "crop": "wheat",
  "pathogen": "rust",
  "region": "Punjab"
}
```

**Response (LLM unavailable — automatic fallback):**
```json
{
  "risk_level": "MODERATE",
  "posterior_probability": 0.52,
  "prescription": {
    "action": "monitor",
    "message": "MONITOR: 52% probability. Continue regular observation."
  },
  "crop": "wheat",
  "pathogen": "rust",
  "region": "Punjab"
}
```

### `POST /api/v1/threat/assess`

Batch-assess threat risk for multiple growers in a campaign.

**Request:**
```json
{
  "growers": [
    { "grower_id": "GRW_00001", "crop": "wheat", "state": "Punjab" },
    { "grower_id": "GRW_00002", "crop": "rice", "state": "Bihar" }
  ],
  "campaign_crop": "wheat"
}
```

**Response:**
```json
[
  {
    "grower_id": "GRW_00001",
    "risk_level": "HIGH",
    "confidence": 0.82,
    "prescription": { "action": "full_mitigation", "llm_generated": true }
  },
  {
    "grower_id": "GRW_00002",
    "risk_level": "LOW",
    "confidence": 0.15,
    "prescription": { "action": "discard" }
  }
]
```

## Integration with Existing `POST /predict-receptivity`

The threat confidence can be used as an additional scoring factor in the receptivity predictor:

```python
# In predictor.py
from app.threat_module.enricher import get_threat_context

def calculate_receptivity_score(grower, campaign_product, campaign_crop):
    score = 0

    # ... existing scoring logic (open rate, click rate, device, etc.) ...

    # NEW: Add live threat context as a scoring factor
    threat = get_threat_context(grower, campaign_crop)
    if threat["risk_level"] == "CRITICAL":
        score += 20
    elif threat["risk_level"] == "HIGH":
        score += 12
    elif threat["risk_level"] == "MODERATE":
        score += 5

    return min(100, score)
```

## Integration with Existing `POST /optimize`

The timing optimizer can shift send times based on threat urgency:

```python
if threat["risk_level"] in ("CRITICAL", "HIGH"):
    timing["send_now"] = True
    timing["reason"] = "Urgent pest threat detected"
```

## Integration with Existing `POST /generate` (Batch)

With the threat module active, each grower message is personalized with live threat risk — and the prescription itself is LLM-generated when the NVIDIA key is available:

```
Without threat module:
  "Use Tilt 250 EC to protect your wheat crop."

With threat module + LLM active:
  "⚠️ URGENT: Wheat rust outbreak confirmed near your area (82% confidence).
   Apply Tilt 250 EC at 0.5ml/L within 48 hours. Reduce nitrogen and boost
   potassium to strengthen plant cell walls. Scout your fields today."

With threat module + LLM unavailable (automatic fallback):
  "ADVISORY: 82% probability of wheat threat. Scout fields and prepare mitigation."
```

## Testing the Integration

```bash
# Start the backend
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Test threat check
curl -X POST http://localhost:8000/api/v1/threat/check \
  -H "Content-Type: application/json" \
  -d '{"raw_text": "Potato late blight in Punjab", "source_trust": 0.8}'

# Test batch assess
curl -X POST http://localhost:8000/api/v1/threat/assess \
  -H "Content-Type: application/json" \
  -d '{"growers": [{"grower_id": "GRW_00001", "crop": "potato", "state": "Punjab"}], "campaign_crop": "potato"}'

# Run threat module unit tests
cd /path/to/crop-threat-detection
pytest tests/ -v
```

## Summary of Changes

| File | Change |
|------|--------|
| `backend/app/threat_module/` | **NEW** — entire module copied from this repo |
| `backend/app/threat_module/llm_client.py` | **NEW** — reuses your `NVIDIA_API_KEY`, auto-disables if absent |
| `backend/app/threat_module/routes.py` | **NEW** — FastAPI router (`/threat/check`, `/threat/assess`) |
| `backend/app/threat_module/enricher.py` | **NEW** — helper to inject threat context into messages |
| `backend/app/main.py` | **MODIFY** — register `threat_router` |
| `backend/app/ai_generator.py` | **MODIFY** — call `get_threat_context()` before LLM call |
| `backend/app/predictor.py` | **MODIFY** — add threat confidence as scoring factor |
| `backend/requirements.txt` | **MODIFY** — add `langgraph`, `langchain-nvidia-ai-endpoints` |
| `frontend/src/app/page.tsx` | **MODIFY** — add ThreatPanel component |

No changes to your `.env` are required — the existing `NVIDIA_API_KEY` is reused automatically.
