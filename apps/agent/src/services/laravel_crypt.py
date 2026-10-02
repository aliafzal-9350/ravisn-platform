"""Decrypt values written by Laravel's `encrypted` cast (Crypt::encryptString).

Laravel and the agent share one database. Channel access tokens are stored
encrypted with Laravel's APP_KEY, so the agent decrypts them here instead of
receiving them in plaintext through Redis.

Payload format (Illuminate\\Encryption\\Encrypter, AES-256-CBC):
    base64( json{ "iv": b64(iv), "value": b64(ciphertext), "mac": hex, "tag": "" } )
    mac = HMAC-SHA256(key, iv_b64 + value_b64), ciphertext is PKCS#7 padded.
"""
import base64
import hashlib
import hmac
import json
from typing import Optional

from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes


class DecryptionError(Exception):
    pass


def _key_bytes(app_key: str) -> bytes:
    if app_key.startswith("base64:"):
        return base64.b64decode(app_key[len("base64:"):])
    return app_key.encode("utf-8")


def decrypt_string(payload: str, app_key: str) -> str:
    """Decrypt a Laravel encryptString() payload, verifying its MAC first."""
    if not app_key:
        raise DecryptionError("APP_KEY is not configured.")

    key = _key_bytes(app_key)
    if len(key) != 32:
        raise DecryptionError("Only AES-256-CBC (32-byte APP_KEY) payloads are supported.")

    try:
        data = json.loads(base64.b64decode(payload))
        iv_b64, value_b64, mac = data["iv"], data["value"], data["mac"]
    except Exception as e:  # not base64 / not JSON / missing fields
        raise DecryptionError(f"Not a Laravel encrypted payload: {e}") from e

    expected = hmac.new(key, (iv_b64 + value_b64).encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, mac):
        raise DecryptionError("MAC is invalid.")

    decryptor = Cipher(algorithms.AES(key), modes.CBC(base64.b64decode(iv_b64))).decryptor()
    padded = decryptor.update(base64.b64decode(value_b64)) + decryptor.finalize()
    unpadder = padding.PKCS7(128).unpadder()
    return (unpadder.update(padded) + unpadder.finalize()).decode("utf-8")


def decrypt_or_none(payload: Optional[str], app_key: Optional[str]) -> Optional[str]:
    """Decrypt a stored token, or None when it is empty or cannot be decrypted."""
    if not payload or not app_key:
        return None
    try:
        return decrypt_string(payload, app_key)
    except DecryptionError:
        return None
