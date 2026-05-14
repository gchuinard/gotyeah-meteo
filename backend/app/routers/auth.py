"""
Module : auth.py
Rôle   : Endpoints d'authentification — inscription, connexion, refresh, déconnexion, profil.

Dépendances notables :
  - python-jose : décodage du JWT pour identifier l'utilisateur courant
  - OAuth2PasswordBearer : extraction du token Bearer depuis le header Authorization
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.db.base import get_db
from app.db.models import Preferences, RefreshToken, User
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Réponse générique pour ne pas indiquer si le token est invalide ou expiré
_CREDENTIALS_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dépendance FastAPI : décode le JWT et retourne l'utilisateur authentifié.

    Args:
        token (str): JWT Bearer extrait du header Authorization.
        db (AsyncSession): Session de base de données.

    Returns:
        User: Instance ORM de l'utilisateur authentifié.

    Raises:
        HTTPException: 401 si le token est invalide ou l'utilisateur introuvable.
    """
    try:
        # uuid.UUID est inclus dans le try : un JWT valide dont le claim "sub"
        # n'est pas un UUID doit produire un 401, pas une 500
        user_id = uuid.UUID(decode_access_token(token))
    except (JWTError, ValueError):
        raise _CREDENTIALS_EXC

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise _CREDENTIALS_EXC
    return user


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """
    Crée un nouveau compte utilisateur avec ses préférences par défaut.

    Args:
        body (RegisterRequest): Email et mot de passe (min 8 caractères).
        db (AsyncSession): Session de base de données.

    Returns:
        TokenResponse: Access token et refresh token prêts à l'emploi.

    Raises:
        HTTPException: 400 si l'email est déjà enregistré.
    """
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(email=body.email, username=body.username, password_hash=hash_password(body.password))
    db.add(user)
    # flush pour obtenir user.id avant d'insérer les lignes dépendantes
    await db.flush()

    db.add(Preferences(user_id=user.id))

    raw, token_hash, expires_at = create_refresh_token()
    db.add(RefreshToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at))
    await db.commit()

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=raw,
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """
    Authentifie un utilisateur et émet un nouveau pair de tokens.

    Args:
        body (LoginRequest): Email et mot de passe.
        db (AsyncSession): Session de base de données.

    Returns:
        TokenResponse: Access token et refresh token.

    Raises:
        HTTPException: 401 si les identifiants sont incorrects.
    """
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Purge des refresh tokens expirés — évite une croissance non bornée de la table
    await db.execute(
        delete(RefreshToken).where(
            RefreshToken.user_id == user.id,
            RefreshToken.expires_at < datetime.now(timezone.utc),
        )
    )

    raw, token_hash, expires_at = create_refresh_token()
    db.add(RefreshToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at))
    await db.commit()

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=raw,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """
    Émet un nouveau couple de tokens à partir d'un refresh token valide (rotation).

    Le refresh token présenté est révoqué et remplacé : un token volé ne reste
    exploitable que jusqu'au prochain refresh légitime.

    Args:
        body (RefreshRequest): Refresh token brut envoyé par le client.
        db (AsyncSession): Session de base de données.

    Returns:
        TokenResponse: Nouvel access token et nouveau refresh token.

    Raises:
        HTTPException: 401 si le refresh token est invalide, révoqué ou expiré.
    """
    token_hash = hash_refresh_token(body.refresh_token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    rt = result.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if not rt or rt.revoked_at is not None or rt.expires_at.replace(tzinfo=timezone.utc) < now:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    # Rotation : on révoque le token présenté et on en émet un nouveau
    rt.revoked_at = now
    raw, new_hash, expires_at = create_refresh_token()
    db.add(RefreshToken(user_id=rt.user_id, token_hash=new_hash, expires_at=expires_at))
    await db.commit()

    return TokenResponse(
        access_token=create_access_token(str(rt.user_id)),
        refresh_token=raw,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(body: RefreshRequest, db: AsyncSession = Depends(get_db)) -> None:
    """
    Révoque le refresh token pour invalider la session côté serveur.

    Args:
        body (RefreshRequest): Refresh token à révoquer.
        db (AsyncSession): Session de base de données.
    """
    token_hash = hash_refresh_token(body.refresh_token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    rt = result.scalar_one_or_none()
    if rt and rt.revoked_at is None:
        rt.revoked_at = datetime.now(timezone.utc)
        await db.commit()


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Supprime le compte de l'utilisateur connecté (cascade sur préférences, favoris, tokens).

    Args:
        current_user (User): Utilisateur résolu par la dépendance get_current_user.
        db (AsyncSession): Session de base de données.
    """
    await db.delete(current_user)
    await db.commit()


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)) -> UserOut:
    """
    Retourne les informations du compte de l'utilisateur connecté.

    Args:
        current_user (User): Utilisateur résolu par la dépendance get_current_user.

    Returns:
        UserOut: Id, email et date de création.
    """
    return UserOut(
        id=str(current_user.id),
        email=current_user.email,
        username=current_user.username,
        created_at=current_user.created_at.isoformat(),
    )
