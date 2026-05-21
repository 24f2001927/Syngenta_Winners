# Kisaan Kavach — Agent Guide

## Quick start

```bash
# Backend (port 8000)
cd backend && source venv2/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (port 3000)
cd frontend && npm run dev
```

## Layout

| Path | What |
|---|---|
| `backend/app/main.py` | FastAPI entrypoint — routes, CORS, all endpoints |
| `backend/app/ai_generator.py` | NVIDIA LLM content generation (NVIDIA_API_KEY required) |
| `backend/app/predictor.py` | Campaign receptivity scoring (0-100) with live threat context |
| `backend/app/data_loader.py` | CSV loading, aggregation, campaign CRUD |
| `backend/app/threat_module/` | LangGraph Bayesian threat detection (9-node state machine) |
| `frontend/src/app/page.tsx` | Single-page dashboard — all UI in one file |
| `frontend/src/app/components/` | `InsightsDashboard.tsx`, `ThreatPanel.tsx` |
| `dataset/` | 8 raw CSVs + 7 pre-computed analysis CSVs (confidential hackathon data) |
| `real-time-crop-threats-detection/` | Standalone LangGraph threat agent (tests, CI) |

## NVIDIA LLM — graceful degradation

The platform uses `meta/llama-3.1-8b-instruct` via NVIDIA API. **Every LLM call auto-falls-back** to deterministic logic if the API key is missing or unreachable. No code changes needed — the system works identically with or without a key.

The `.env` lives at `backend/.env`. Key variable: `NVIDIA_API_KEY`.

## Threat detection module

- 9-node StateGraph: ingestion → NER → weather → suitability → historical → likelihood → trust → bayesian → decision
- Bayesian fusion formula in `bayesian.py`
- Tests in `real-time-crop-threats-detection/tests/` — `pytest tests/ -v` (LLM auto-disabled via conftest.py)
- CI in `real-time-crop-threats-detection/.github/workflows/main.yml`

## Frontend (Next.js 16 + Tailwind v4)

- **Tailwind v4** uses `@tailwindcss/postcss` (not the old `tailwindcss/postcss`) — see `postcss.config.mjs`
- `tsconfig.json`: `"moduleResolution": "bundler"`, `"jsx": "react-jsx"`, `@/*` → `./src/*`
- Single page app, no routing. Edit `page.tsx` and components to change UI
- Before writing frontend code, read the relevant guide in `node_modules/next/dist/docs/` — this version has breaking changes from the Next.js you may know

## Backend

- Python 3.12, venv at `backend/venv2/`
- FastAPI with CORS open to `*`
- No dedicated test suite for the main backend API
- Deps: `fastapi`, `uvicorn`, `pandas`, `langchain`, `langgraph`, `langchain-nvidia-ai-endpoints`, `requests`

## Dataset

- All in `dataset/` — 8 CSVs (6000 growers, 4000 retailers, 310k inventory rows, 235k POS rows)
- Pre-computed analysis in `dataset/analysis_results/` (7 CSVs)
- Served by `data_loader.get_analysis_results()` → `GET /analysis`
- **Confidential** — do not commit raw CSVs or expose identifiers
