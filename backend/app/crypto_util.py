from cryptography.fernet import Fernet, InvalidToken

from app.config import get_settings

_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is not None:
        return _fernet
    settings = get_settings()
    key = (settings.encryption_key or "").strip()
    if not key:
        key = Fernet.generate_key().decode()
    if isinstance(key, str):
        key_bytes = key.encode()
    else:
        key_bytes = key
    try:
        _fernet = Fernet(key_bytes)
    except Exception:
        _fernet = Fernet(Fernet.generate_key())
    return _fernet


def encrypt_text(plain: str) -> str:
    if not plain:
        return ""
    return _get_fernet().encrypt(plain.encode("utf-8")).decode("utf-8")


def decrypt_text(token: str) -> str:
    if not token:
        return ""
    try:
        return _get_fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        return "[unavailable]"
