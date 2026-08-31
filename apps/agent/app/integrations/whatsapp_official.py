import os
import httpx

GRAPH_API_VERSION = "v21.0"
GRAPH_BASE = "https://graph.facebook.com/" + GRAPH_API_VERSION

# Without a real app secret configured we can't talk to Meta's servers yet
# (no Tech Provider approval / app configured), so replies are logged instead
# of actually sent. Flip this on for real by setting META_APP_SECRET.
def is_mock_mode():
    return not bool(os.getenv("META_APP_SECRET", "").strip())


def send_message(phone_number_id: str, access_token: str, to: str, body: str) -> dict:
    if is_mock_mode() and (not access_token or access_token == "mock"):
        print(f"[MOCK] whatsapp official -> would send to {to}: {body}")
        return {"messages": [{"id": "mock-message-id"}], "mock": True}

    try:
        resp = httpx.post(
            f"{GRAPH_BASE}/{phone_number_id}/messages",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "messaging_product": "whatsapp",
                "to": to,
                "type": "text",
                "text": {"body": body},
            },
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPError as err:
        error_detail = ""
        if hasattr(err, "response") and err.response is not None:
            error_detail = err.response.text
        print(f"[Meta API Error] Failed to send WhatsApp message: {err} | Detail: {error_detail}")
        return {"error": str(err), "detail": error_detail}
