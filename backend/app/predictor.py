"""Campaign receptivity prediction engine using historical engagement data."""
import json
from . import data_loader
from app.threat_module.enricher import get_threat_context

CROP_PEST_MAP = {
    "wheat": ["wheat rust", "powdery mildew", "leaf blight", "aphids"],
    "mustard": ["white rust", "aphids", "alternaria blight", "downy mildew"],
    "chickpea": ["fusarium wilt", "pod borer", "ascochyta blight", "root rot"],
    "potato": ["late blight", "early blight", "scab", "aphids"],
    "barley": ["powdery mildew", "net blotch", "scald", "rust"],
    "lentil": ["fusarium wilt", "rust", "blight", "pod borer"],
    "maize": ["stem borer", "leaf blight", "rust", "downy mildew"],
    "safflower": ["rust", "wilt", "leaf spot", "aphids"],
    "cumin": ["wilting", "blight", "powdery mildew", "aphids"],
}

def predict_receptivity(growers, campaign_product, campaign_crop):
    """
    Score growers (0-100) on predicted campaign receptivity based on:
    - Historical open/click rates from whatsapp_campaign.csv
    - Language, device, state engagement patterns
    - Product-crop affinity
    """
    history = data_loader.get_historical_engagement()
    hist_map = {h["grower_id"]: h for h in history}

    overall_stats = _compute_overall_engagement_stats(history)

    scored = []
    for g in growers:
        gid = g.get("grower_id")
        h = hist_map.get(gid, {})
        score = 50.0

        # 1. Historical engagement (biggest weight)
        if h:
            score += (h.get("open_rate", 0) * 100) * 0.25  # +25 pts max
            score += (h.get("click_rate", 0) * 100) * 0.15  # +15 pts max

        # 2. Device type boost
        if g.get("device_type") == "smartphone":
            score += 8

        # 3. Language engagement factor
        lang = g.get("language", "")
        lang_avg_open = overall_stats.get("lang_open", {}).get(lang, 0.2)
        score += lang_avg_open * 10

        # 4. State engagement factor
        state = g.get("state", "")
        state_avg_open = overall_stats.get("state_open", {}).get(state, 0.2)
        score += state_avg_open * 7

        # 5. Product-crop fit score
        crop_match = _product_crop_fit(campaign_product, campaign_crop, g)
        score += crop_match * 15

        # 6. Farm size (larger farms engage more)
        farm = g.get("grower_farm_size", 1) or 1
        score += min(farm * 0.5, 5)

        # 7. Offline campaign attendance
        if g.get("offline_campaign_attended"):
            score += 10

        # 8. Recent product scan
        if g.get("product_scan"):
            score += 5

        # 9. Live threat context
        try:
            threat = get_threat_context(g, campaign_crop)
            if threat["risk_level"] == "CRITICAL":
                score += 20
            elif threat["risk_level"] == "HIGH":
                score += 12
            elif threat["risk_level"] == "MODERATE":
                score += 5
        except Exception:
            pass

        scored.append({
            "grower_id": gid,
            "name": f"{g.get('district')}, {g.get('state')}",
            "language": g.get("language"),
            "device": g.get("device_type"),
            "farm_size": g.get("grower_farm_size"),
            "receptivity_score": round(min(max(score, 0), 100), 1),
            "predicted_open_rate": round(min((h.get("open_rate", 0.2) + score / 300), 1.0), 3),
            "predicted_click_rate": round(min((h.get("click_rate", 0.05) + score / 400), 1.0), 3),
        })

    scored.sort(key=lambda x: x["receptivity_score"], reverse=True)
    return scored


def get_contextual_pests(grower):
    """Get relevant pest threats based on grower's crop calendar."""
    try:
        cal = json.loads(grower.get("grower_crop_calendar") or "{}")
    except Exception:
        cal = {}
    crop = (cal.get("crop") or "").lower()
    stage = _get_current_stage(cal)
    season = cal.get("season", "Rabi_2025-26")
    pests = CROP_PEST_MAP.get(crop, ["general pests"])
    return {
        "crop": crop,
        "season": season,
        "current_stage": stage,
        "threats": pests,
        "severity": "high" if stage in ["flowering", "tillering"] else "moderate",
    }


def recommend_channel(grower):
    """Recommend best channel based on device and historical data."""
    device = grower.get("device_type", "")
    if device == "smartphone":
        return {"channel": "WhatsApp", "priority": 1, "reason": "Smartphone user - WhatsApp delivers best open rates"}
    elif device == "basic_phone":
        return {"channel": "SMS", "priority": 2, "reason": "Basic phone - SMS is most reliable"}
    return {"channel": "SMS/Voice", "priority": 3, "reason": "Voice call or SMS recommended"}


def recommend_timing(grower, history_data=None):
    """Recommend best day/time to send based on historical patterns."""
    state = grower.get("state", "")
    # Pattern: Rabi season farmers are available early morning or evening
    if state in ["Punjab", "Haryana", "Uttar Pradesh"]:
        return {"day": "Weekday", "time": "6:00 AM - 7:00 AM", "reason": "Farmers active before field work"}
    elif state in ["Rajasthan", "Madhya Pradesh"]:
        return {"day": "Weekday", "time": "7:00 AM - 8:00 AM", "reason": "Post-breakfast slot works best"}
    elif state in ["Bihar"]:
        return {"day": "Any", "time": "5:00 PM - 6:00 PM", "reason": "Evening slot after returning from fields"}
    return {"day": "Weekday", "time": "7:00 AM", "reason": "Standard morning slot"}


def _compute_overall_engagement_stats(history):
    if not history:
        return {"lang_open": {}, "state_open": {}}
    growers_df = data_loader.load_growers()
    hdf = data_loader.load_whatsapp_campaigns()
    merged = hdf.merge(growers_df[["grower_id", "language", "state"]], on="grower_id", how="left")
    lang_open = merged.groupby("language")["opened_status"].mean().to_dict()
    state_open = merged.groupby("state")["opened_status"].mean().to_dict()
    return {"lang_open": lang_open, "state_open": state_open}


def _product_crop_fit(product, campaign_crop, grower):
    try:
        cal = json.loads(grower.get("grower_crop_calendar") or "{}")
    except Exception:
        cal = {}
    grower_crop = (cal.get("crop") or "").lower()
    if grower_crop == campaign_crop:
        return 1.0
    return 0.3


def _get_current_stage(cal):
    stages = cal.get("stages", [])
    if not stages:
        return "unknown"
    return stages[-1].get("stage", "unknown")
