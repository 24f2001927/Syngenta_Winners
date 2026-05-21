# 🇮🇳 Kisaan Kavach — AI Shield for Indian Agriculture

**Kisaan Kavach: AI shield that detects crop threats, personalizes farmer outreach, and automates mitigation — all in real time.**

**Live Demo:** https://syngenta-winners-uhme.vercel.app

A scalable, AI-powered agricultural marketing and threat intelligence platform for Syngenta India. The platform combines a **LangGraph Bayesian threat detection pipeline** with a **personalized campaign engine** — targeting 6,000+ smallholder farmers with context-aware messaging in their native language while simultaneously monitoring for crop diseases using real-time weather telemetry.

---

## Core Innovation

**Kisaan Kavach** integrates two systems that feed each other:
- **Threat Detection Module** — 9-node LangGraph state machine that ingests unstructured field reports, extracts crop-disease entities via NVIDIA LLM, cross-verifies against Open-Meteo weather data, and outputs a Bayesian posterior probability with automated mitigation prescriptions
- **Campaign Engine** — LLM-powered personalized message generation across WhatsApp, SMS, and Voice, with receptivity scoring that incorporates live threat context (CRITICAL threat → +20 score)

---

## Architecture Overview

```
project/
├── backend/                  # FastAPI Python server
│   ├── app/
│   │   ├── main.py           # API routes & server entry
│   │   ├── ai_generator.py   # LLM-based content generation (NVIDIA Llama 3.1)
│   │   ├── data_loader.py    # Dataset loading & aggregation
│   │   ├── predictor.py      # Receptivity prediction + threat-aware scoring
│   │   └── threat_module/    # LangGraph Bayesian threat detection pipeline
│   │       ├── graph.py      # 9-node StateGraph wiring
│   │       ├── state.py      # CropThreatState TypedDict
│   │       ├── config.py     # Thresholds, API keys, timeouts
│   │       ├── llm_client.py # NVIDIA LLM client with auto-disable
│   │       ├── routes.py     # /api/v1/threat/check + /assess
│   │       ├── enricher.py   # Threat context injector for campaigns
│   │       └── nodes/        # ingestion, NER, weather, suitability,
│   │                         # historical, likelihood, trust, bayesian, decision
│   └── requirements.txt
├── frontend/                 # Next.js 16 React application
│   └── src/app/
│       ├── page.tsx          # Single-page dashboard
│       ├── components/
│       │   ├── InsightsDashboard.tsx  # 6-tab analytics with SVG charts
│       │   └── ThreatPanel.tsx        # Real-time threat assessment UI
│       └── globals.css
├── dataset/
│   ├── analysis_results/     # 7 pre-computed insight CSVs
│   └── (8 raw CSV files)
└── real-time-crop-threats-detection/  # Standalone threat agent
```

---

## Features

### 1. Real-Time Crop Threat Detection
9-node LangGraph Bayesian pipeline with NVIDIA LLM augmentation:
- **NER Extraction** — LLM-first entity extraction with keyword fallback
- **Weather Telemetry** — Open-Meteo API for temperature, humidity, soil moisture
- **Suitability Index** — biophysical reasoning vs formula fallback
- **Bayesian Fusion** — `P(R_true | W_t, S_trust) = L·P·S / (L·P·S + (1-L)·(1-P)·(1-S))`
- **Decision Engine** — LLM-generated prescription with product name, dosage, preventive measures
- **Graceful Degradation** — every LLM node auto-falls-back if NVIDIA API is unavailable

### 2. AI Content Generator
Generates personalized marketing messages using **NVIDIA Llama 3.1 8B Instruct**. Each message is tailored to:
- Location (state, district), Language (Hindi, Marathi, Punjabi, Gujarati, etc.)
- Crop & Growth Stage from crop calendar JSON
- Farm Size, Device Type (WhatsApp for smartphones, SMS/Voice for basic phones)
- Active Pest Threats from real-time threat context
- Campaign Goal & Product from predefined templates

### 3. Campaign Receptivity Prediction
Predicts grower engagement (0–100) using 9 weighted factors including live threat context:
- Historical open/click rates, device type, language/state patterns
- Product-crop fit, farm size, offline attendance, product scan
- **Threat context bonus**: CRITICAL +20, HIGH +12, MODERATE +5

### 4. Analytics Dashboard (6-Tab Insights)
7 pre-computed CSV analyses visualized with pure SVG charts:
- Grower device distribution (donut), farm segments (bar)
- Marketing funnel by crop (impressions → visits → leads)
- Supply chain stockout risk per SKU
- Territory balance across 500 regions
- WhatsApp sales impact by product

### 5. Campaign Lifecycle Management
- View all active campaigns, create new with writable product autocomplete
- Products auto-sync across the application
- One-click delete with instant refresh

### 6. Batch Push Delivery
- Push All / Push One — WhatsApp, SMS, or Voice
- Channel optimization per device type
- Send-time optimized by state (Punjab 6-7 AM, Bihar 5-6 PM)

---

## API Reference

All endpoints at `http://localhost:8000`

### Threat Detection
- **`POST /api/v1/threat/check`** — Assess threat for a single report. Returns risk level, posterior probability, suitability, likelihood, prior, prescription (LLM-generated when available).
- **`POST /api/v1/threat/assess`** — Batch-assess threats across multiple growers.

### Campaign Engine
- **`GET /stats`** — Summary statistics (6,000 growers, 10 states, 6 languages)
- **`GET /analysis`** — Full analysis results from 7 CSV insight files
- **`GET /growers?state=&language=`** — Filtered grower list
- **`GET /campaigns`** — All campaigns (GET + POST + DELETE)
- **`GET /products`** — Unique product names
- **`POST /generate`** — Single grower message generation
- **`POST /generate-batch`** — Multi-grower batch generation
- **`POST /predict-receptivity`** — Engagement scoring with threat context
- **`POST /optimize`** — Channel, timing, pest recommendations
- **`POST /push-all`** — Simulate message delivery

---

## Setup & Running

### Prerequisites
- Python 3.10+
- Node.js 18+
- NVIDIA API key (optional — system works without it via deterministic fallback)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in the browser.

---

## Tech Stack

- **Backend:** Python 3.12, FastAPI, Pandas, LangGraph, NVIDIA Llama 3.1 API
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Threat Detection:** LangGraph StateGraph, Bayesian inference, Open-Meteo API
- **AI Model:** `meta/llama-3.1-8b-instruct` via NVIDIA Integrate API (auto-disables on failure)
- **Data:** 8 raw CSV datasets + 7 pre-computed analysis CSVs

---

## Bayesian Confidence Thresholds

| Posterior | Risk Level | Action |
|-----------|-----------|--------|
| ≥ 85% | CRITICAL | Full mitigation: drone spray, SMS alerts, fertigation lockout |
| ≥ 60% | HIGH | Advisory: scout fields, prepare mitigation |
| ≥ 30% | MODERATE | Monitor: continue observation |
| &lt; 30% | LOW | Discard: insufficient confidence |
