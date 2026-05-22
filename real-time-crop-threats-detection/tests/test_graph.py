from src.graph import build_graph, create_initial_state


def test_graph_executes_end_to_end():
    graph = build_graph()
    initial = create_initial_state()
    result = graph.invoke(initial)
    assert "risk_level" in result
    assert "posterior_probability" in result
    assert "prescription" in result


def test_graph_high_confidence_path():
    graph = build_graph()
    initial = create_initial_state()
    initial["source_metadata"] = {"trust_score": 0.9}
    result = graph.invoke(initial)
    assert result["risk_level"] in ("LOW", "MODERATE", "HIGH", "CRITICAL")
    assert 0.0 <= result["posterior_probability"] <= 1.0


def test_graph_produces_prescription():
    graph = build_graph()
    result = graph.invoke(create_initial_state())
    assert "action" in result.get("prescription", {})
