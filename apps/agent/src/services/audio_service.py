import io
import logging
from typing import Optional, Tuple
from src.config import settings

logger = logging.getLogger(__name__)


class AudioService:
    @staticmethod
    async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.ogg") -> Tuple[Optional[str], float]:
        """Transcribe audio bytes using Groq Whisper or OpenAI Whisper."""
        if not audio_bytes:
            return None, 0.0

        # Try Groq (ultra-fast transcription) first if key is present
        if settings.GROQ_API_KEY:
            try:
                from groq import AsyncGroq
                client = AsyncGroq(api_key=settings.GROQ_API_KEY)
                file_obj = io.BytesIO(audio_bytes)
                file_obj.name = filename

                transcription = await client.audio.transcriptions.create(
                    file=(filename, file_obj.read()),
                    model="whisper-large-v3",
                    response_format="json",
                    temperature=0.0
                )
                text = transcription.text.strip()
                logger.info(f"[AudioService] Groq transcribed: {text[:60]}...")
                return text, 0.95
            except Exception as e:
                logger.warning(f"[AudioService] Groq Whisper failed: {e}. Falling back to OpenAI...")

        # Fallback to OpenAI Whisper
        if settings.OPENAI_API_KEY:
            try:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                file_obj = io.BytesIO(audio_bytes)
                file_obj.name = filename

                transcription = await client.audio.transcriptions.create(
                    file=file_obj,
                    model="whisper-1",
                    response_format="text"
                )
                text = str(transcription).strip()
                logger.info(f"[AudioService] OpenAI transcribed: {text[:60]}...")
                return text, 0.90
            except Exception as e:
                logger.error(f"[AudioService] OpenAI Whisper failed: {e}")

        return None, 0.0
