import logging
from src.graph.state import AgentState
from src.scoring.lead_scorer import LeadScoringEngine

logger = logging.getLogger(__name__)


async def lead_scoring_node(state: AgentState) -> AgentState:
    """Evaluates conversation signals and appends real-time lead score to telemetry."""
    try:
        scoring_result = LeadScoringEngine.score_lead(state)
        state["telemetry"]["lead_scoring"] = scoring_result
    except Exception as e:
        logger.error(f"[LeadScoringNode] Error computing lead score: {e}")
        state["telemetry"]["lead_scoring"] = {
            "lead_score": 30,
            "lead_category": "cold",
            "confidence": 0.5
        }

    return state
