import time
import logging
import httpx
from typing import Dict, Any, List, Optional
from src.config import settings

logger = logging.getLogger(__name__)


class LLMFactory:
    """Enterprise Multi-AI Provider Priority Cascade:
    1. Primary Engine: Groq (llama-3.3-70b-versatile)
    2. Secondary Engine: Google Gemini (gemini-2.5-flash)
    3. Tertiary Engine: xAI Grok (grok-3-mini)
    4. Quaternary Engine: OpenAI (gpt-4o-mini / gpt-4o)
    """

    @staticmethod
    def chat_messages(system_prompt: str, user_query: str, history: Optional[List[Dict[str, str]]] = None) -> List[Dict[str, str]]:
        """OpenAI-style messages: instructions, earlier turns, then the new message."""
        return [
            {"role": "system", "content": system_prompt},
            *[{"role": turn["role"], "content": turn["content"]} for turn in (history or [])],
            {"role": "user", "content": user_query},
        ]

    @staticmethod
    def gemini_contents(system_prompt: str, user_query: str, history: Optional[List[Dict[str, str]]] = None) -> List[Dict[str, Any]]:
        """Gemini contents: earlier turns ("model" for replies), then the new message."""
        contents = [
            {"role": "model" if turn["role"] == "assistant" else "user", "parts": [{"text": turn["content"]}]}
            for turn in (history or [])
        ]
        contents.append({"role": "user", "parts": [{"text": f"System Context:\n{system_prompt}\n\nUser Query:\n{user_query}"}]})
        return contents

    @classmethod
    async def generate_response(
        cls,
        system_prompt: str,
        user_query: str,
        temperature: float = 0.3,
        max_tokens: int = 800,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """Reply to `user_query`, given the conversation so far (`history`, oldest first)."""
        start_time = time.time()
        messages = cls.chat_messages(system_prompt, user_query, history)

        # 1. Primary Engine: Groq
        if settings.GROQ_API_KEY:
            try:
                from groq import AsyncGroq
                client = AsyncGroq(api_key=settings.GROQ_API_KEY)
                model_name = settings.GROQ_CHAT_MODEL

                resp = await client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens
                )

                latency_ms = int((time.time() - start_time) * 1000)
                content = resp.choices[0].message.content.strip()
                prompt_tokens = resp.usage.prompt_tokens if resp.usage else len(system_prompt + user_query) // 4
                completion_tokens = resp.usage.completion_tokens if resp.usage else len(content) // 4

                logger.info(f"[LLMFactory] Primary (Groq {model_name}) succeeded in {latency_ms}ms ({completion_tokens} tokens)")
                return {
                    "content": content,
                    "model": f"groq:{model_name}",
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "latency_ms": latency_ms,
                    "confidence_score": None
                }
            except Exception as e:
                logger.warning(f"[LLMFactory] Groq failed: {e}. Cascading to Gemini...")

        # 2. Secondary Engine: Google Gemini
        if settings.GEMINI_API_KEY:
            try:
                model_name = settings.GEMINI_CHAT_MODEL
                # The key travels in a header, never in the URL: request URLs are logged.
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
                payload = {
                    "contents": cls.gemini_contents(system_prompt, user_query, history),
                    "generationConfig": {
                        "temperature": temperature,
                        "maxOutputTokens": max_tokens
                    }
                }
                async with httpx.AsyncClient(timeout=12.0) as http_client:
                    resp = await http_client.post(url, json=payload, headers={"x-goog-api-key": settings.GEMINI_API_KEY})
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            content = candidates[0]["content"]["parts"][0]["text"].strip()
                            latency_ms = int((time.time() - start_time) * 1000)
                            prompt_tokens = data.get("usageMetadata", {}).get("promptTokenCount", 0)
                            completion_tokens = data.get("usageMetadata", {}).get("candidatesTokenCount", 0)

                            logger.info(f"[LLMFactory] Secondary (Gemini {model_name}) succeeded in {latency_ms}ms")
                            return {
                                "content": content,
                                "model": f"gemini:{model_name}",
                                "prompt_tokens": prompt_tokens,
                                "completion_tokens": completion_tokens,
                                "latency_ms": latency_ms,
                                "confidence_score": None
                            }
            except Exception as e:
                logger.warning(f"[LLMFactory] Gemini failed: {e}. Cascading to xAI Grok...")

        # 3. Tertiary Engine: xAI Grok
        if settings.XAI_API_KEY:
            try:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=settings.XAI_API_KEY, base_url="https://api.x.ai/v1")
                model_name = settings.XAI_CHAT_MODEL

                resp = await client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens
                )

                latency_ms = int((time.time() - start_time) * 1000)
                content = resp.choices[0].message.content.strip()
                prompt_tokens = resp.usage.prompt_tokens if resp.usage else len(system_prompt + user_query) // 4
                completion_tokens = resp.usage.completion_tokens if resp.usage else len(content) // 4

                logger.info(f"[LLMFactory] Tertiary (xAI {model_name}) succeeded in {latency_ms}ms")
                return {
                    "content": content,
                    "model": f"xai:{model_name}",
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "latency_ms": latency_ms,
                    "confidence_score": None
                }
            except Exception as e:
                logger.warning(f"[LLMFactory] xAI Grok failed: {e}. Cascading to OpenAI...")

        # 4. Quaternary Engine: OpenAI
        if settings.OPENAI_API_KEY:
            try:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                model_name = settings.OPENAI_CHAT_MODEL

                resp = await client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens
                )

                latency_ms = int((time.time() - start_time) * 1000)
                content = resp.choices[0].message.content.strip()
                prompt_tokens = resp.usage.prompt_tokens if resp.usage else len(system_prompt + user_query) // 4
                completion_tokens = resp.usage.completion_tokens if resp.usage else len(content) // 4

                logger.info(f"[LLMFactory] Quaternary (OpenAI {model_name}) succeeded in {latency_ms}ms")
                return {
                    "content": content,
                    "model": f"openai:{model_name}",
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "latency_ms": latency_ms,
                    "confidence_score": None
                }
            except Exception as e:
                logger.error(f"[LLMFactory] OpenAI failed: {e}")

        # 5. Deterministic Fallback Generation (Offline / Mock / Sandbox Mode)
        latency_ms = int((time.time() - start_time) * 1000)
        fallback_reply = (
            "Thank you for contacting us! We have received your inquiry and our support team "
            "will assist you shortly."
        )
        return {
            "content": fallback_reply,
            "model": "fallback:rules_engine",
            "prompt_tokens": len(system_prompt + user_query) // 4,
            "completion_tokens": len(fallback_reply) // 4,
            "latency_ms": latency_ms,
            "confidence_score": None
        }
