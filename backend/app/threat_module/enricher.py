from app.threat_module.graph import build_graph, create_initial_state


def get_threat_context(grower: dict, campaign_crop: str = "") -> dict:
    graph = build_graph()
    state = create_initial_state()

    crop = campaign_crop or grower.get("grower_crop_calendar", "")
    state["raw_texts"] = [
        f"{crop} growing in {grower.get('state', '')} "
        f"district {grower.get('district', '')}."
    ]
    state["source_metadata"] = {"trust_score": 0.75}

    result = graph.invoke(state)

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
