import logging

from app.threat_module.graph import build_graph, create_initial_state
from app.threat_module.utils.logger import setup_logger

logger = setup_logger(__name__)


def main():
    logger.info("=== Real-Time Crop Threat Detection System ===")

    graph = build_graph()
    initial_state = create_initial_state()

    logger.info("Starting graph execution")
    final_state = graph.invoke(initial_state)

    logger.info("=== Execution Complete ===")
    logger.info("Risk Level: %s", final_state.get("risk_level", "UNKNOWN"))
    logger.info("Posterior Probability: %s", final_state.get("posterior_probability", 0.0))
    logger.info("Prescription: %s", final_state.get("prescription", {}))
    logger.info("Errors: %s", final_state.get("errors", []))

    print("\n=== RESULTS ===")
    print(f"Risk Level:          {final_state.get('risk_level', 'UNKNOWN')}")
    print(f"Posterior Confidence: {final_state.get('posterior_probability', 0.0):.2%}")
    print(f"Prescription Action:  {final_state.get('prescription', {}).get('action', 'N/A')}")
    if final_state.get("prescription", {}).get("message"):
        print(f"Message:             {final_state['prescription']['message']}")
    if final_state.get("errors"):
        print(f"Errors:              {final_state['errors']}")
    print("========================\n")


if __name__ == "__main__":
    main()
