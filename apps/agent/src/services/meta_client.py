import logging
import httpx
from typing import Optional, Dict, Any, List
from src.config import settings

logger = logging.getLogger(__name__)


class MetaGraphClient:
    def __init__(self):
        self.api_version = settings.META_API_VERSION
        self.base_url = f"https://graph.facebook.com/{self.api_version}"

    async def send_message(
        self,
        channel: str,
        recipient_id: str,
        text: str,
        access_token: str,
        phone_number_id: Optional[str] = None,
        quick_replies: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Dispatch channel-optimized response to Meta Graph API based on channel type."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            headers = {"Authorization": f"Bearer {access_token}"}
            channel_norm = (channel or "whatsapp").lower()

            if channel_norm == "whatsapp":
                phone_id = phone_number_id or settings.WHATSAPP_PHONE_NUMBER_ID or "me"
                url = f"{self.base_url}/{phone_id}/messages"
                payload = {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": recipient_id,
                    "type": "text",
                    "text": {"preview_url": False, "body": text}
                }

            elif channel_norm == "instagram":
                # Instagram Direct enforces a 1,000 character limit
                truncated_text = text[:996] + "..." if len(text) > 1000 else text
                url = f"{self.base_url}/me/messages"
                payload = {
                    "recipient": {"id": recipient_id},
                    "message": {"text": truncated_text}
                }

            else:
                # Facebook Messenger (2,000 character limit + optional Quick Replies)
                truncated_text = text[:1996] + "..." if len(text) > 2000 else text
                url = f"{self.base_url}/me/messages"
                message_payload: Dict[str, Any] = {"text": truncated_text}

                if quick_replies:
                    message_payload["quick_replies"] = [
                        {"content_type": "text", "title": qr[:20], "payload": qr}
                        for qr in quick_replies[:13]  # Messenger max 13 quick replies
                    ]

                payload = {
                    "recipient": {"id": recipient_id},
                    "message": message_payload
                }

            try:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code >= 400:
                    logger.error(f"[MetaGraphClient] Error {response.status_code}: {response.text}")
                    return {"error": response.text, "status_code": response.status_code}
                return response.json()
            except Exception as e:
                logger.error(f"[MetaGraphClient] Request exception: {str(e)}")
                return {"error": str(e)}

    async def fetch_media_bytes(self, media_id: str, access_token: str) -> Optional[bytes]:
        """Retrieve media buffer from Meta Graph API CDN."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {"Authorization": f"Bearer {access_token}"}
            try:
                # 1. Fetch media URL
                url = f"{self.base_url}/{media_id}"
                resp = await client.get(url, headers=headers)
                if resp.status_code != 200:
                    logger.error(f"[MetaGraphClient] Failed to fetch media URL: {resp.text}")
                    return None

                media_url = resp.json().get("url")
                if not media_url:
                    return None

                # 2. Download binary media stream
                download_resp = await client.get(media_url, headers=headers)
                if download_resp.status_code == 200:
                    return download_resp.content
            except Exception as e:
                logger.error(f"[MetaGraphClient] Exception downloading media: {str(e)}")

        return None
