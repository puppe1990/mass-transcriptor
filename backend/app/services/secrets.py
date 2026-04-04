from __future__ import annotations

import base64
import hashlib
import hmac
import secrets

from app.config import Settings


def _key_material() -> bytes:
    settings = Settings()
    return settings.derived_encryption_key


def _xor_stream(payload: bytes, key: bytes, nonce: bytes) -> bytes:
    output = bytearray()
    counter = 0
    while len(output) < len(payload):
        block = hashlib.sha256(key + nonce + counter.to_bytes(4, "big")).digest()
        output.extend(block)
        counter += 1
    return bytes(left ^ right for left, right in zip(payload, output[: len(payload)], strict=True))


def encrypt_secret(raw_value: str) -> str:
    key = _key_material()
    nonce = secrets.token_bytes(16)
    plaintext = raw_value.encode("utf-8")
    ciphertext = _xor_stream(plaintext, key, nonce)
    signature = hmac.new(key, nonce + ciphertext, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(nonce + signature + ciphertext).decode("utf-8")


def decrypt_secret(encrypted_value: str) -> str:
    decoded = base64.urlsafe_b64decode(encrypted_value.encode("utf-8"))
    nonce = decoded[:16]
    signature = decoded[16:48]
    ciphertext = decoded[48:]
    key = _key_material()
    expected = hmac.new(key, nonce + ciphertext, hashlib.sha256).digest()
    if not hmac.compare_digest(signature, expected):
        raise ValueError("Invalid encrypted secret")
    return _xor_stream(ciphertext, key, nonce).decode("utf-8")
