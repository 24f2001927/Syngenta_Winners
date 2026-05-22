from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv
from . import data_loader, ai_generator, predictor
from app.threat_module.routes import router as threat_router

load_dotenv()

app = FastAPI(title="Syngenta AI Marketing API")
app.include_router(threat_router, prefix="/api/v1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CreateCampaignRequest(BaseModel):
    name: str
    product: Optional[str] = ""
    target_crop: Optional[str] = ""
    goal: Optional[str] = ""

class GenerationRequest(BaseModel):
    grower_data: dict
    campaign_goal: str
    product_name: Optional[str] = None
    language: Optional[str] = None
    pest_context: Optional[dict] = None
    timing_context: Optional[dict] = None

class BatchGenerationRequest(BaseModel):
    growers: list[dict]
    campaign_goal: str
    product_name: Optional[str] = None
    language: Optional[str] = None

class ReceptivityRequest(BaseModel):
    growers: list[dict]
    campaign_product: str
    campaign_crop: str

class PushAllRequest(BaseModel):
    messages: list[dict]  # [{grower_id, channel, content}]

class OptimizeRequest(BaseModel):
    grower: dict

@app.get("/")
async def root():
    return {"message": "Syngenta AI Marketing API is running"}

@app.get("/stats")
async def get_stats():
    return data_loader.get_summary_stats()

@app.get("/analysis")
async def get_analysis():
    return data_loader.get_analysis_results()

@app.get("/growers")
async def get_growers(state: str = None, language: str = None):
    filters = {"state": state, "language": language}
    return data_loader.get_grower_segments(filters)

@app.get("/campaigns")
async def get_campaigns():
    return data_loader.get_campaigns()

@app.post("/campaigns")
async def create_campaign(req: CreateCampaignRequest):
    return data_loader.create_campaign(req.model_dump())

@app.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str):
    data_loader.delete_campaign(campaign_id)
    return {"status": "deleted", "id": campaign_id}

@app.get("/products")
async def get_products():
    return data_loader.get_products()

@app.get("/sales")
async def get_sales(product: str = None, state: str = None):
    return data_loader.get_sales_data(product=product, state=state)

@app.post("/generate")
async def generate_campaign(request: GenerationRequest):
    content = ai_generator.generate_marketing_content(
        request.grower_data,
        request.campaign_goal,
        product_name=request.product_name,
        language=request.language,
        pest_context=request.pest_context,
        timing_context=request.timing_context,
    )
    return {"content": content}

@app.post("/generate-batch")
async def generate_batch(request: BatchGenerationRequest):
    results = []
    for grower in request.growers:
        pest_ctx = predictor.get_contextual_pests(grower)
        chan = predictor.recommend_channel(grower)
        timing = predictor.recommend_timing(grower)
        content = ai_generator.generate_marketing_content(
            grower,
            request.campaign_goal,
            product_name=request.product_name,
            language=request.language or grower.get("language"),
            pest_context=pest_ctx,
            channel=chan.get("channel"),
            timing_context=timing,
        )
        results.append({
            "grower_id": grower.get("grower_id"),
            "content": content,
            "recommended_channel": chan,
            "recommended_timing": timing,
        })
    return {"results": results}

@app.post("/predict-receptivity")
async def predict_receptivity(request: ReceptivityRequest):
    scores = predictor.predict_receptivity(
        request.growers, request.campaign_product, request.campaign_crop
    )
    return {"scores": scores}

@app.post("/optimize")
async def optimize(request: OptimizeRequest):
    g = request.grower
    return {
        "channel": predictor.recommend_channel(g),
        "timing": predictor.recommend_timing(g),
        "pest_context": predictor.get_contextual_pests(g),
    }

@app.post("/push-all")
async def push_all(request: PushAllRequest):
    success_count = 0
    for msg in request.messages:
        try:
            # Simulate push - in production would integrate with WhatsApp/SMS API
            success_count += 1
        except Exception:
            pass
    return {
        "status": "success",
        "pushed": success_count,
        "total": len(request.messages),
        "message": f"Successfully pushed {success_count} of {len(request.messages)} messages",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
