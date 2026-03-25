"""
Module : security.py
Rôle   : Fonctions cryptographiques — hachage de mots de passe, création et validation de tokens JWT.

Dépendances notables :
  - passlib[bcrypt] : hachage sécurisé des mots de passe
  - python-jose     : création et décodage des JSON Web Tokens
"""

import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hache un mot de passe en clair avec bcrypt.

    Args:
        password (str): Mot de passe en clair.

    Returns:
        str: Hash bcrypt prêt à stocker en base.
    """
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """
    Vérifie qu'un mot de passe en clair correspond à son hash bcrypt.

    Args:
        plain (str): Mot de passe saisi par l'utilisateur.
        hashed (str): Hash stocké en base.

    Returns:
        bool: True si le mot de passe est correct.
    """
    return pwd_context.verify(plain, hashed)


def _utcnow() -> datetime:
    """Retourne l'heure courante en UTC."""
    return datetime.now(timezone.utc)


def create_access_token(user_id: str) -> str:
    """
    Crée un JWT d'accès signé avec l'identifiant utilisateur.

    Args:
        user_id (str): UUID de l'utilisateur (str).

    Returns:
        str: Token JWT signé, valide pour la durée configurée.
    """
    expire = _utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    payload: dict[str, Any] = {"sub": user_id, "exp": expire, "type": "access"}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token() -> tuple[str, str, datetime]:
    """
    Génère un refresh token aléatoire et retourne sa forme hashée pour stockage.

    Returns:
        tuple: (token_brut, sha256_hash, date_expiration) — ne stocker que le hash.
    """
    raw = str(uuid.uuid4())
    # On stocke uniquement le hash SHA-256 pour se prémunir contre les fuites de base
    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    expires_at = _utcnow() + timedelta(days=settings.refresh_token_expire_days)
    return raw, token_hash, expires_at


def hash_refresh_token(raw: str) -> str:
    """
    Hache un refresh token brut en SHA-256 pour la comparaison en base.

    Args:
        raw (str): Token brut reçu du client.

    Returns:
        str: Empreinte SHA-256 hexadécimale.
    """
    return hashlib.sha256(raw.encode()).hexdigest()


def decode_access_token(token: str) -> str:
    """
    Décode et valide un JWT d'accès.

    Args:
        token (str): JWT brut reçu dans le header Authorization.

    Returns:
        str: user_id extrait du claim "sub".

    Raises:
        JWTError: Si le token est invalide, expiré ou n'est pas un access token.
    """
    payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    if payload.get("type") != "access":
        raise JWTError("not an access token")
    sub: str | None = payload.get("sub")
    if sub is None:
        raise JWTError("missing sub")
    return sub
