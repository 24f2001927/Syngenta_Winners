# Kisaan Kavach — Real-Time Crop Threat Detection & Verification Engine

**Part of the Kisaan Kavach platform.**
A production-ready LangGraph AI agent that ingests unstructured agricultural reports, extracts crop-disease entities using an NVIDIA LLM, cross-verifies against real-time weather telemetry, and outputs a probabilistic risk map with automated mitigation prescriptions.

## How It Works

The system implements a **Bayesian verification pipeline** as a directed LangGraph state machine. Four of the nine nodes optionally use an NVIDIA LLM (`meta/llama-3.1-8b-instruct`) for richer understanding, with automatic fallback to deterministic logic when the API is unavailable.

```
[Web Reports] → [NER Extraction] ← optional NVIDIA LLM
                      │
                      ▼
              [Weather API] (Open-Meteo)
                      │
                      ▼
           [Suitability Index] ← optional NVIDIA LLM
                      │
    ┌─────────────────┼─────────────────┐
    ▼                 ▼                 ▼
[Historical Prior] [Likelihood]  [Source Trust]
         │        ← optional     │
         │         NVIDIA LLM    │
    └────┴───────────────────────┘
                      │
              [Bayesian Fusion]
                      │
              [Decision Engine] ← optional NVIDIA LLM
                      │
        ┌────── route_by_confidence ──────┐
        ▼          ▼          ▼           ▼
    CRITICAL     HIGH     MODERATE       LOW
   (P ≥ 85%)  (P ≥ 60%)  (P ≥ 30%)    (P < 30%)
```

### The Bayesian Formula

The core confidence score is the posterior probability that a scraped report is true given observed weather and source trust:

```
P(R_true | W_t, S_trust) = P(W_t | D_active) · P(D_active | G_hist) · S_trust
                           ─────────────────────────────────────────────────
                                               Z
```

| Term | Meaning | Source |
|------|---------|--------|
| `P(W_t | D_active)` | Likelihood — weather favours pathogen? | LLM or temp/humidity formula |
| `P(D_active | G_hist)` | Historical prior — disease common in region? | Historical outbreak records |
| `S_trust` | Source reliability (beta-binomial) | Updated per-report |
| `Z` | Normalizing constant | Sum over true/false scenarios |

### Graceful Degradation

Every LLM-powered node follows this chain:

```
Has API key?  →  Validate key (chat completions probe, 5s)
     │ fail / no key
     ▼
Deterministic fallback  ←  Also on: network error, timeout (10s), bad response JSON
     │
     ▼
  Fast path (no LLM latency)
```

This means the system works **identically** with or without an NVIDIA API key — the LLM just makes outputs richer and more contextual.

## Project Structure

```
src/
├── state.py              # CropThreatState TypedDict (19 keys, Annotated reducers)
├── config.py             # Env-based config: thresholds, API keys, timeouts
├── graph.py              # LangGraph StateGraph wiring + conditional routing
├── llm_client.py         # NVIDIA ChatNVIDIA client (singleton, probe, timeout, auto-disable)
├── main.py               # CLI entry point
├── nodes/
│   ├── ingestion.py      # Web data ingestion (mock RSS/news feeds)
│   ├── ner_extractor.py  # NER: LLM-first, keyword fallback, (crop, disease, region)
│   ├── weather.py        # Open-Meteo API client with fallback
│   ├── suitability.py    # Biophysical suitability: LLM-first, formula fallback
│   ├── historical.py     # Historical prior probability lookup table
│   ├── likelihood.py     # Weather-disease likelihood: LLM-first, formula fallback
│   ├── trust.py          # Beta-binomial source trust update
│   ├── bayesian.py       # Bayesian fusion engine (the core formula)
│   └── decision.py       # Decision engine: LLM-first (product, dosage), rule fallback
├── utils/
│   └── logger.py         # Structured logging setup
tests/
├── conftest.py           # Disables LLM in tests for speed
├── test_nodes.py         # 11 node unit tests
└── test_graph.py         # 3 integration tests (end-to-end graph)
```

## Setup

### Prerequisites
- Python 3.10+
- Internet connection (for Open-Meteo weather API and optional NVIDIA API)

### Installation

```bash
# Clone and enter directory
cd real-time-crop-threats-detection

# Create virtual environment
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment config
cp .env.example .env
```

### Configuration (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `OPEN_METEO_BASE_URL` | `https://api.open-meteo.com/v1/forecast` | Weather API endpoint |
| `SOURCE_TRUST_ALPHA` | `0.7` | Temporal smoothing factor for trust updates |
| `HIGH_CONFIDENCE_THRESHOLD` | `0.85` | Critical risk threshold (≥85%) |
| `MODERATE_CONFIDENCE_THRESHOLD` | `0.60` | High risk threshold (≥60%) |
| `LOW_CONFIDENCE_THRESHOLD` | `0.30` | Moderate risk threshold (≥30%) |
| `NVIDIA_API_KEY` | *(empty)* | NVIDIA AI API key — leave blank to disable LLM nodes |
| `NVIDIA_MODEL` | `meta/llama-3.1-8b-instruct` | NVIDIA model ID for LLM nodes |
| `LLM_ENABLED` | `auto` | `auto` (enables if key present), `true`, or `false` |
| `LLM_REQUEST_TIMEOUT` | `10` | Seconds to wait per LLM request before falling back |
| `LOG_LEVEL` | `INFO` | Logging verbosity |

## Usage

### Run the CLI

```bash
python -m src.main
```

Sample output (with NVIDIA LLM enabled):

```
=== RESULTS ===
Risk Level:          HIGH
Posterior Confidence: 82.19%
Prescription Action:  full_mitigation
Message:             CRITICAL: 82% verified threat on wheat, rice. Automated mitigation triggered.
```

Sample output (without NVIDIA LLM — automatic fallback):

```
=== RESULTS ===
Risk Level:          MODERATE
Posterior Confidence: 51.98%
Prescription Action:  monitor
Message:             MONITOR: 52% probability. Continue regular observation.
```

### Run Tests

```bash
pytest tests/ -v
```

All 14 tests pass. Tests automatically disable LLM calls for speed (via `tests/conftest.py`).

### Use as a Library

```python
from src.graph import build_graph, create_initial_state

graph = build_graph()
state = create_initial_state()

# Populate with your own data
state["raw_texts"] = ["Wheat rust reported in Punjab, high humidity conditions."]
state["source_metadata"] = {"trust_score": 0.85, "source": "farmers-forum"}

result = graph.invoke(state)

print(f"Risk: {result['risk_level']}")
print(f"Confidence: {result['posterior_probability']:.2%}")
print(f"Action: {result['prescription']['action']}")
```

### Confidence Thresholds

| Posterior | Risk Level | Action |
|-----------|-----------|--------|
| ≥ 85% | **CRITICAL** | Full mitigation: irrigation lockout, drone spraying, SMS alerts, fertigation adjustment |
| ≥ 60% | **HIGH** | Advisory: SMS alerts, scout fields, prepare mitigation |
| ≥ 30% | **MODERATE** | Monitor: continue regular observation |
| < 30% | **LOW** | Discard: low confidence threat |

## Node-by-Node Breakdown

### 1. `ingest_web_streams`
Mocks ingestion from RSS feeds, news APIs, or agricultural portals. Returns raw text + source metadata with trust score. Replace with real Scrapy/RSS parser for production.

### 2. `extract_entities`
**LLM-first**: Calls NVIDIA LLM with a structured JSON prompt to extract `(crop, disease, region)` triples. Handles misspellings, regional crop names, and multilingual text.
**Fallback**: Keyword-based regex matching (crops: wheat, rice, potato...; diseases: blast, blight, rust...; regions: capitalized words).

### 3. `fetch_weather_telemetry`
Calls [Open-Meteo API](https://open-meteo.com/) (free, no key required) for temperature, humidity, and soil moisture at the report's geographic coordinates. Falls back to default values on failure.

### 4. `compute_suitability_index`
**LLM-first**: Asks the LLM to assess biophysical suitability given weather + pathogen type (fungal/bacterial/viral). Returns index + reasoning.
**Fallback**: Weighted formula: `suitability = 0.5·humidity_score + 0.3·temp_score + 0.2·moisture_score`.

### 5. `lookup_historical_prior`
Looks up `P(D_active | G_hist)` from a static dictionary:
- rice_blast: 0.45, wheat_blast: 0.30, potato_blight: 0.55, maize_rust: 0.25, grape_mildew: 0.40

### 6. `compute_likelihood`
**LLM-first**: Asks the LLM to estimate `P(W_t | D_active)` given current weather and the specific pathogen.
**Fallback**: Sigmoid-like function of temperature (optimum 22°C) and humidity (optimum 85%).

### 7. `update_source_trust`
Beta-binomial trust update: `S_trust(t+1) = α · S_trust(t) + (1 - α) · suitability`.

### 8. `bayesian_fusion`
Computes the full posterior:
```python
numerator = likelihood * prior * trust
denominator = numerator + (1-likelihood) * (1-prior) * (1-trust)
posterior = numerator / denominator
```

### 9. `decision_engine`
**LLM-first**: Generates a structured prescription JSON with `action`, `message`, `specific_product`, `application_instructions`, and `preventive_measures`.
**Fallback**: Rule-based mapping of posterior to risk level with canned messages.

## NVIDIA LLM Integration Details

### LLM Client (`src/llm_client.py`)

- **Singleton**: One `ChatNVIDIA` instance per process (thread-safe with `threading.Lock()`)
- **Connectivity Probe**: On first use, sends a minimal chat completion request to validate the API key. Returns fast 401 detection (<1s) or network timeout (5s).
- **Request Timeout**: Each LLM invoke runs in a `ThreadPoolExecutor` with a configurable timeout (default 10s). If the model hangs, the node falls back instantly.
- **Auto-Disable**: On auth failure or repeated timeouts, sets `_client_available = False` permanently for the process lifetime — no repeated retries.

### Prompts Used

| Node | System Prompt |
|------|--------------|
| NER | Extract crop names, diseases, geographic regions as JSON from agri text |
| Suitability | Assess biophysical suitability given weather + pathogen type |
| Likelihood | Estimate P(W_t | D_active) for current weather + pathogen |
| Decision | Generate mitigation prescription with product name, dosage, preventive measures |

## Extending the System

### Add a new crop-disease pair
Edit `src/nodes/historical.py`:
```python
HISTORICAL_PRIORS["tomato_blight"] = 0.35
```

### Use a different LLM model
Set `NVIDIA_MODEL` in `.env` to any model available on the [NVIDIA API](https://build.nvidia.com/):
```ini
NVIDIA_MODEL=meta/llama-3.1-8b-instruct
```

### Add real web scraping
Replace `src/nodes/ingestion.py` with Scrapy RSS feed readers or newspaper3k Article parsing.

### Connect to real IoT sensors
Modify `src/nodes/weather.py` to read from on-farm weather stations instead of Open-Meteo.

### Adjust LLM temperature / top_p
Edit `src/llm_client.py`:
```python
_client = ChatNVIDIA(..., temperature=0.5, top_p=0.95)
```

## Tech Stack

- **Language**: Python 3.12
- **Framework**: LangGraph (StateGraph with Annotated reducers)
- **AI/LLM**: NVIDIA `meta/llama-3.1-8b-instruct` via `langchain-nvidia-ai-endpoints`
- **Statistics**: Bayesian inference, beta-binomial update, biophysical modeling
- **APIs**: Open-Meteo (free weather), NVIDIA AI (chat completions)
- **Validation**: Pytest (14 tests, LLM-disabled for speed)
- **Config**: python-dotenv, environment variables
- **CI**: GitHub Actions (`.github/workflows/main.yml`)

## Integration with Kisaan Kavach Platform

This engine is integrated into the main Kisaan Kavach backend at `backend/app/threat_module/` and serves three API endpoints:

- **`POST /api/v1/threat/check`** — Single threat assessment with full Bayesian output
- **`POST /api/v1/threat/assess`** — Batch assessment across multiple growers
- **`app/threat_module/enricher.py`** — Injector that feeds live threat context into campaign message generation

The module reuses the platform's existing `NVIDIA_API_KEY` and includes automatic graceful degradation — all nodes fall back to deterministic logic when the API is unavailable.

## CI/CD

The included GitHub Actions workflow automatically runs all tests on push/PR to `main`:

```yaml
# .github/workflows/main.yml
- uses: actions/checkout@v4
- run: pip install -r requirements.txt pytest
- run: pytest -v
```

Tests run without an NVIDIA key, exercising the deterministic fallback paths exclusively.
