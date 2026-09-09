# Security & Compliance Architecture — RAVISN Platform

## 1. Webhook Authentication & HMAC Validation

All inbound webhooks originating from Meta (WhatsApp, Facebook Messenger, Instagram) are signed using HMAC SHA-256.

```php
// In apps/core/app/Services/WhatsApp/WebhookHandler.php
$expectedSignature = hash_hmac('sha256', $rawPayload, $metaAppSecret);
if (!hash_equals("sha256=" . $expectedSignature, $headerSignature)) {
    abort(403, 'Invalid Meta Webhook Signature');
}
```

- Timing attacks are prevented using constant-time string comparison (`hash_equals`).
- Requests with invalid signatures are rejected immediately prior to JSON parsing.

---

## 2. Channel Token & Credential Encryption

- Access tokens for Meta WhatsApp Business Accounts (WABA) and Page Access Tokens are stored encrypted in the database using AES-256-GCM (`channel_identities.access_token`).
- Encryption keys are derived securely from Laravel's `APP_KEY`.

---

## 3. Autonomous AI Safety Guardrails

In `apps/agent/src/graph/nodes/guardrail_node.py`:
1. **Zero-Pricing Hallucination Protection**: Prohibits the AI agent from promising unauthorized custom discounts or $0 pricing models not present in the enterprise knowledge base.
2. **Channel Character Bounds**: Truncates and formats messages to comply with channel-specific constraints (e.g. WhatsApp markdown vs. Instagram 1000-character limits).
3. **Prompt Injection & Escaping Defense**: Strips system prompt override patterns and role-impersonation delimiters from user queries.

---

## 4. Human Takeover Safety Switch

When a human staff member opens a thread or sends a manual message:
- The thread flag `bot_active` is immediately set to `false`.
- The autonomous agent worker automatically drops pending AI generation tasks for that thread.
- Staff takeover notifications are dispatched across secure real-time websockets.
