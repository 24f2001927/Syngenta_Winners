import os
import requests
import json

NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
MODEL = "meta/llama-3.1-8b-instruct"

DEFAULT_SYSTEM_PROMPT = (
    "You are an agricultural marketing specialist for Syngenta India. "
    "Keep responses under 150 words. Use simple farmer-friendly language. "
    "Always output in the requested language. Be concise and practical."
)

def generate_marketing_content(grower_data, campaign_goal, product_name=None, language=None,
                                pest_context=None, channel=None, timing_context=None):
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        return "Error: NVIDIA_API_KEY not found in environment."

    target_language = language or grower_data.get("language", "Hindi")
    product = product_name or "our product"
    channel = channel or ("WhatsApp" if grower_data.get("device_type") == "smartphone" else "SMS/Voice")

    # Build context-aware user prompt
    parts = [
        f"Generate a personalized {channel} message in {target_language}",
        f"for a farmer in {grower_data.get('state')}, {grower_data.get('district')}.",
        f"Farm size: {grower_data.get('grower_farm_size')} acres.",
        f"Device: {grower_data.get('device_type')}.",
    ]

    crop_info = grower_data.get("grower_crop_calendar")
    if crop_info:
        try:
            cal = json.loads(crop_info) if isinstance(crop_info, str) else crop_info
            crop = cal.get("crop", "unknown")
            stage = cal.get("stages", [])
            stage_name = stage[-1].get("stage", "unknown") if stage else "unknown"
            parts.append(f"Current crop: {crop}, growth stage: {stage_name}.")
        except Exception:
            pass

    if pest_context:
        pests = pest_context.get("threats", [])
        if pests:
            parts.append(f"Active pest threats: {', '.join(pests)}.")
        parts.append(f"Threat severity: {pest_context.get('severity', 'moderate')}.")

    if timing_context:
        parts.append(f"Send timing: {timing_context.get('day', 'Weekday')} at {timing_context.get('time', 'morning')}.")

    parts.append(f"\nCampaign: {campaign_goal}")
    parts.append(f"Product: {product}")
    parts.append(f"\nProvide:\n1. Message Content (in {target_language})\n2. One-line reasoning\n3. Call to Action")

    user_prompt = " ".join(parts)

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": DEFAULT_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.5,
        "top_p": 0.7,
        "max_tokens": 600,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(NVIDIA_API_URL, headers=headers, json=payload, timeout=45)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except requests.Timeout:
        return "Generation timed out. Please try again."
    except Exception as e:
        return f"Generation failed: {str(e)}"
