import pandas as pd
import os
import json
import math

DATASET_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "dataset")

_cache = {}

def clean_nan(obj):
    if isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nan(v) for v in obj]
    elif isinstance(obj, float) and math.isnan(obj):
        return None
    return obj

def _load(name):
    if name not in _cache:
        _cache[name] = pd.read_csv(os.path.join(DATASET_PATH, name))
    return _cache[name]

def load_growers():
    return _load("growers.csv")

def load_retailers():
    return _load("retailers.csv")

def load_reps_territory():
    return _load("reps_territory.csv")

def load_whatsapp_campaigns():
    return _load("whatsapp_campaign.csv")

def load_digital_funnel():
    return _load("digital_funnel_weekly.csv")

def load_retailer_pos():
    return _load("retailer_pos.csv")

def load_retailer_inventory():
    return _load("retailer_inventory_weekly.csv")

def load_retailer_visit_log():
    return _load("retailer_visit_log.csv")

def get_grower_segments(filters=None):
    growers = load_growers()
    if filters:
        if "state" in filters and filters["state"]:
            growers = growers[growers["state"] == filters["state"]]
        if "language" in filters and filters["language"]:
            growers = growers[growers["language"] == filters["language"]]
    result = growers.head(100).to_dict(orient="records")
    return clean_nan(result)

def get_summary_stats():
    growers = load_growers()
    return {
        "total_growers": len(growers),
        "states": growers["state"].dropna().unique().tolist(),
        "languages": growers["language"].dropna().unique().tolist(),
        "device_types": growers["device_type"].dropna().unique().tolist(),
    }

CAMPAIGNS = [
    {"id": "camp_001", "name": "Wheat Rust Protection", "product": "Tilt 250 EC", "target_crop": "wheat", "goal": "Promote Tilt 250 EC fungicide for wheat rust prevention and higher yield"},
    {"id": "camp_002", "name": "Mustard Disease Control", "product": "Score 250 EC", "target_crop": "mustard", "goal": "Promote Score 250 EC for mustard disease management"},
    {"id": "camp_003", "name": "Pulse Crop Protection", "product": "Amistar 250 SC", "target_crop": "chickpea", "goal": "Promote Amistar 250 SC for chickpea disease protection"},
    {"id": "camp_004", "name": "Potato Late Blight Control", "product": "Kavach 75 WP", "target_crop": "potato", "goal": "Promote Kavach 75 WP for potato late blight prevention"},
    {"id": "camp_005", "name": "Barley Health Boost", "product": "Amistar 250 SC", "target_crop": "barley", "goal": "Promote Amistar 250 SC for barley disease protection"},
    {"id": "camp_006", "name": "Lentil Crop Protection", "product": "Amistar 250 SC", "target_crop": "lentil", "goal": "Promote Amistar 250 SC for lentil disease management"},
    {"id": "camp_007", "name": "Safflower Disease Control", "product": "Score 250 EC", "target_crop": "safflower", "goal": "Promote Score 250 EC for safflower disease prevention"},
    {"id": "camp_008", "name": "Cumin Health Management", "product": "Amistar 250 SC", "target_crop": "cumin", "goal": "Promote Amistar 250 SC for cumin crop health"},
    {"id": "camp_009", "name": "Maize Crop Protection", "product": "Amistar 250 SC", "target_crop": "maize", "goal": "Promote Amistar 250 SC for maize disease control"},
    {"id": "camp_010", "name": "General Fungicide Awareness", "product": "Tilt 250 EC", "target_crop": "wheat", "goal": "General awareness about fungicide use for Rabi crops"},
]

def get_campaigns():
    return CAMPAIGNS

def create_campaign(data):
    new_id = f"camp_{len(CAMPAIGNS) + 1:03d}"
    campaign = {
        "id": new_id,
        "name": data["name"],
        "product": data.get("product", ""),
        "target_crop": data.get("target_crop", ""),
        "goal": data.get("goal", ""),
    }
    CAMPAIGNS.append(campaign)
    return campaign

def delete_campaign(campaign_id):
    global CAMPAIGNS
    CAMPAIGNS = [c for c in CAMPAIGNS if c["id"] != campaign_id]
    return True

def get_products():
    return sorted(load_whatsapp_campaigns()["campaign_product"].dropna().unique().tolist())

def add_product(name):
    products = get_products()
    if name not in products:
        products.append(name)
    return name

def get_historical_engagement():
    """Return aggregated engagement stats per grower from whatsapp_campaign."""
    df = load_whatsapp_campaigns()
    agg = df.groupby("grower_id").agg(
        total_messages=("id", "count"),
        delivered=("delivered_status", lambda x: (x == True).sum()),
        opened=("opened_status", lambda x: (x == True).sum()),
        clicked=("clicked_status", lambda x: (x == True).sum()),
    ).reset_index()
    agg["open_rate"] = (agg["opened"] / agg["total_messages"]).fillna(0)
    agg["click_rate"] = (agg["clicked"] / agg["total_messages"]).fillna(0)
    return agg.to_dict(orient="records")

def get_sales_data(product=None, state=None, week=None):
    """Get POS sales data with optional filters."""
    pos = load_retailer_pos()
    retailers = load_retailers()
    merged = pos.merge(retailers, on="retailer_id", how="left")
    if product:
        merged = merged[merged["sku_name"] == product]
    if state:
        merged = merged[merged["state"] == state]
    agg = merged.groupby("sku_name").agg(
        total_qty=("sku_qty", "sum"),
        total_revenue=("sku_price", "sum"),
        transaction_count=("transaction_id", "count"),
    ).reset_index()
    return clean_nan(agg.to_dict(orient="records"))

def get_retailers_nearby(tehsil):
    """Find retailers in or near a tehsil."""
    retailers = load_retailers()
    nearby = retailers[retailers["tehsil"] == tehsil].to_dict(orient="records")
    return clean_nan(nearby)

ANALYSIS_RESULTS_PATH = os.path.join(
    os.path.dirname(DATASET_PATH), "dataset", "analysis_results"
)

_analysis_cache = {}

def _load_analysis(name):
    if name not in _analysis_cache:
        _analysis_cache[name] = pd.read_csv(os.path.join(ANALYSIS_RESULTS_PATH, name))
    return _analysis_cache[name]

def get_analysis_results():
    results = {}
    try:
        devices = _load_analysis("grower_devices.csv")
        results["grower_devices"] = clean_nan(devices.to_dict(orient="records"))
        results["grower_devices_total"] = int(devices["count"].sum())
    except Exception:
        results["grower_devices"] = []

    try:
        segments = _load_analysis("grower_segments.csv")
        results["grower_segments"] = clean_nan(segments.to_dict(orient="records"))
    except Exception:
        results["grower_segments"] = []

    try:
        funnel = _load_analysis("marketing_funnel.csv")
        agg = funnel.groupby("campaign_crop").agg(
            total_impressions=("social_post_impression", "sum"),
            total_visits=("landing_page_visits", "sum"),
            total_leads=("lead_form_submission", "sum"),
            avg_visit_rate=("visit_rate", "mean"),
            avg_lead_rate=("lead_rate", "mean"),
        ).reset_index()
        results["marketing_funnel"] = clean_nan(agg.to_dict(orient="records"))
        results["funnel_totals"] = {
            "total_impressions": int(funnel["social_post_impression"].sum()),
            "total_visits": int(funnel["landing_page_visits"].sum()),
            "total_leads": int(funnel["lead_form_submission"].sum()),
        }
    except Exception:
        results["marketing_funnel"] = []
        results["funnel_totals"] = {}

    try:
        rep = _load_analysis("rep_activity.csv")
        results["rep_activity"] = {
            "total_reps": len(rep),
            "total_visits": int(rep["visit_count"].sum()),
            "avg_visits": round(rep["visit_count"].mean(), 1),
            "max_visits": int(rep["visit_count"].max()),
            "min_visits": int(rep["visit_count"].min()),
        }
    except Exception:
        results["rep_activity"] = {}

    try:
        supply = _load_analysis("supply_chain_summary.csv")
        results["supply_chain"] = clean_nan(supply.to_dict(orient="records"))
        results["supply_summary"] = {
            "total_sku_qty": round(supply["sku_qty"].sum(), 1),
            "avg_sales_velocity": round(supply["sales_velocity"].mean(), 2),
            "avg_stockout_risk": int(supply["stockout_risk"].mean()),
            "highest_stockout": supply.loc[supply["stockout_risk"].idxmax(), "sku_name"],
        }
    except Exception:
        results["supply_chain"] = []
        results["supply_summary"] = {}

    try:
        territory = _load_analysis("territory_balance.csv")
        results["territory_balance"] = {
            "total_territories": len(territory),
            "total_retailers": int(territory["retailer_count"].sum()),
            "avg_retailers_per_territory": round(territory["retailer_count"].mean(), 1),
            "max_retailers": int(territory["retailer_count"].max()),
            "min_retailers": int(territory["retailer_count"].min()),
        }
    except Exception:
        results["territory_balance"] = {}

    try:
        wa = _load_analysis("whatsapp_sales_impact.csv")
        product_sales = wa.groupby("campaign_product").agg(
            total_clicks=("clicks", "sum"),
            total_sales=("total_sales", "sum"),
            transaction_count=("total_sales", "count"),
        ).reset_index()
        results["whatsapp_sales"] = clean_nan(product_sales.to_dict(orient="records"))
        results["whatsapp_totals"] = {
            "total_sales": int(wa["total_sales"].sum()),
            "total_transactions": len(wa),
            "total_clicks": int(wa["clicks"].sum()),
        }
    except Exception:
        results["whatsapp_sales"] = []
        results["whatsapp_totals"] = {}

    return results
