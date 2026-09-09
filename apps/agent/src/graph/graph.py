from langgraph.graph import StateGraph, END
from src.graph.state import AgentState
from src.graph.nodes.audio_transcriber_node import audio_transcriber_node
from src.graph.nodes.router_node import router_node
from src.graph.nodes.rag_retriever_node import rag_retriever_node
from src.graph.nodes.guardrail_node import guardrail_node
from src.graph.nodes.response_generator_node import response_generator_node
from src.graph.nodes.human_handoff_node import human_handoff_node
from src.graph.nodes.lead_scoring_node import lead_scoring_node

# Initialize Multi-Agent StateGraph
workflow = StateGraph(AgentState)

# 1. Add Processing Nodes
workflow.add_node("transcribe_audio", audio_transcriber_node)
workflow.add_node("route_intent", router_node)
workflow.add_node("retrieve_rag", rag_retriever_node)
workflow.add_node("check_guardrails", guardrail_node)
workflow.add_node("generate_response", response_generator_node)
workflow.add_node("score_lead", lead_scoring_node)
workflow.add_node("human_handoff", human_handoff_node)

# 2. Set Entry Point
workflow.set_entry_point("transcribe_audio")

# 3. Define Flow Edges
workflow.add_edge("transcribe_audio", "route_intent")


def intent_router_condition(state: AgentState) -> str:
    """Conditional branching based on detected intent."""
    if state.get("intent") == "human_escalation":
        return "human_handoff"
    return "retrieve_rag"


workflow.add_conditional_edges(
    "route_intent",
    intent_router_condition,
    {
        "human_handoff": "human_handoff",
        "retrieve_rag": "retrieve_rag",
    }
)

workflow.add_edge("retrieve_rag", "check_guardrails")
workflow.add_edge("check_guardrails", "generate_response")
workflow.add_edge("generate_response", "score_lead")
workflow.add_edge("score_lead", END)
workflow.add_edge("human_handoff", END)

# Compile LangGraph State Machine
compiled_agent_graph = workflow.compile()
