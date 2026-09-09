import re
import logging
from typing import Dict, Any, Tuple

logger = logging.getLogger(__name__)


class LeadScoringEngine:
    """
    Lead Scoring Engine evaluating inbound conversation signals to classify lead intent:
    - Categories: 'cold' (0-30), 'warm' (31-60), 'hot' (61-85), 'qualified' (86-100)
    - Extracts multi-modal features: intent, urgency, pricing inquiries, demo requests, sentiment.
    """

    PRICING_KEYWORDS = {"price", "pricing", "cost", "quote", "rate", "fee", "plans", "subscription", "package"}
    DEMO_KEYWORDS = {"demo", "meeting", "call", "schedule", "appointment", "consultation", "talk", "book", "zoom"}
    HIGH_INTENT_KEYWORDS = {"buy", "purchase", "sign up", "enterprise", "contract", "ready", "order", "start", "hire"}
    NEGATIVE_KEYWORDS = {"cancel", "unsubscribe", "stop", "complaint", "refund", "spam", "scam"}

    @classmethod
    def score_lead(cls, state: Dict[str, Any]) -> Dict[str, Any]:
        """Calculates lead score and categorizes the interaction."""
        text = (state.get("raw_content") or "").lower()
        intent = (state.get("intent") or "").lower()
        channel = (state.get("channel") or "whatsapp").lower()

        tokens = set(re.findall(r'\b\w+\b', text))

        base_score = 25  # Inbound message default base engagement

        # 1. Feature Extraction & Keyword Weighting
        pricing_matches = len(tokens.intersection(cls.PRICING_KEYWORDS))
        demo_matches = len(tokens.intersection(cls.DEMO_KEYWORDS))
        high_intent_matches = len(tokens.intersection(cls.HIGH_INTENT_KEYWORDS))
        negative_matches = len(tokens.intersection(cls.NEGATIVE_KEYWORDS))

        score_increment = (pricing_matches * 18) + (demo_matches * 28) + (high_intent_matches * 22)
        score_decrement = negative_matches * 30

        # 2. Intent Bonus
        if "lead_qualification" in intent or "sales" in intent:
            score_increment += 15
        elif "appointment" in intent or "booking" in intent:
            score_increment += 25

        # 3. Channel Weighting
        channel_multiplier = 1.0 if channel == "whatsapp" else 0.9

        final_score = int(min(max((base_score + score_increment - score_decrement) * channel_multiplier, 0), 100))

        # 4. Categorization
        if final_score >= 85:
            category = "qualified"
            confidence = 0.95
        elif final_score >= 60:
            category = "hot"
            confidence = 0.88
        elif final_score >= 35:
            category = "warm"
            confidence = 0.80
        else:
            category = "cold"
            confidence = 0.75

        logger.info(f"[LeadScoringEngine] Evaluated Lead: Score={final_score} | Category={category} (Confidence: {confidence})")

        return {
            "lead_score": final_score,
            "lead_category": category,
            "confidence": confidence,
            "features": {
                "pricing_signal": pricing_matches > 0,
                "demo_signal": demo_matches > 0,
                "high_intent_signal": high_intent_matches > 0,
                "channel": channel
            }
        }
