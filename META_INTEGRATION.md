# Meta Integration Guide — WhatsApp, Messenger & Instagram

## 1. Supported Channels Overview

RAVISN interfaces directly with Meta Graph API v21.0:

1. **WhatsApp Business Platform:** Cloud API message sending, interactive buttons, list messages, media uploads, and read receipts.
2. **Facebook Messenger:** Page messaging, customer thread mapping, and handover protocol.
3. **Instagram Direct Messaging:** Direct messaging, story replies, and media attachments.

---

## 2. Webhook Setup on Meta App Dashboard

1. Navigate to the **Meta for Developers** portal $\rightarrow$ **Your App** $\rightarrow$ **Webhooks**.
2. Select **WhatsApp Business Account** / **Messenger** / **Instagram**.
3. Configure the Callback URL:
   ```text
   https://your-domain.com/webhooks/meta
   ```
4. Configure Verify Token:
   - Enter the token matching `META_VERIFY_TOKEN` in your `apps/core/.env`.
5. Subscribe to Webhook Fields:
   - `messages`
   - `message_deliveries`
   - `message_reads`
   - `phone_number_quality_update`
   - `account_alerts`

---

## 3. Rate-Limiting & Outbound Dispatching

- WhatsApp Business Platform enforces messaging tier rate limits (Tier 1: 1k users/day, Tier 2: 10k users/day, Tier 3: 100k users/day).
- `apps/core` manages outbound queue batches across 4 parallel workers with exponential backoff and jitter on HTTP 429/500 errors.
