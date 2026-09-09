import logging
from src.graph.state import AgentState
from src.services.meta_client import MetaGraphClient
from src.services.audio_service import AudioService

logger = logging.getLogger(__name__)


async def audio_transcriber_node(state: AgentState) -> AgentState:
    """Detects voice notes/audio, fetches media buffer from Meta CDN, and transcribes to text."""
    msg_type = state.get("message_type", "text")
    media_id = state.get("media_id")

    if msg_type in ["audio", "voice"] and media_id and state.get("access_token"):
        logger.info(f"[AudioTranscriberNode] Processing voice note media_id: {media_id}")
        meta_client = MetaGraphClient()
        audio_bytes = await meta_client.fetch_media_bytes(media_id, state["access_token"])

        if audio_bytes:
            transcript, confidence, metrics = await AudioService.transcribe_audio(audio_bytes, f"{media_id}.ogg")
            if transcript:
                state["raw_content"] = transcript
                state["telemetry"]["transcribed"] = True
                state["telemetry"]["transcription_confidence"] = confidence
                state["telemetry"].update(metrics)
                logger.info(f"[AudioTranscriberNode] Transcription success ({metrics.get('asr_latency_ms')}ms): {transcript}")
            else:
                state["raw_content"] = "[Voice Note Received - Unclear Audio]"
        else:
            state["raw_content"] = "[Voice Note Received - Download Failed]"

    return state
