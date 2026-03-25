"""
Module : user.py
Rôle   : Endpoints utilisateur authentifiés — préférences et gestion des villes favorites.

Dépendances notables :
  - get_current_user : dépendance auth partagée depuis app.routers.auth
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.db.models import Favorite, Preferences, User
from app.routers.auth import get_current_user
from app.schemas.user import (
    FavoriteCreate,
    FavoriteOut,
    FavoriteReorderRequest,
    PreferencesOut,
    PreferencesUpdate,
)

router = APIRouter()


@router.get("/preferences", response_model=PreferencesOut)
async def get_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PreferencesOut:
    """
    Retourne les préférences de l'utilisateur connecté.

    Args:
        current_user (User): Utilisateur authentifié.
        db (AsyncSession): Session de base de données.

    Returns:
        PreferencesOut: Système d'unités et thème actuel.

    Raises:
        HTTPException: 404 si les préférences n'existent pas (ne devrait pas arriver après register).
    """
    result = await db.execute(
        select(Preferences).where(Preferences.user_id == current_user.id)
    )
    prefs = result.scalar_one_or_none()
    if prefs is None:
        raise HTTPException(status_code=404, detail="Preferences not found")
    return prefs


@router.put("/preferences", response_model=PreferencesOut)
async def update_preferences(
    body: PreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PreferencesOut:
    """
    Met à jour les préférences de l'utilisateur (mise à jour partielle possible).

    Args:
        body (PreferencesUpdate): Champs à modifier (unit_system et/ou theme).
        current_user (User): Utilisateur authentifié.
        db (AsyncSession): Session de base de données.

    Returns:
        PreferencesOut: Préférences mises à jour.

    Raises:
        HTTPException: 404 si les préférences n'existent pas.
    """
    result = await db.execute(
        select(Preferences).where(Preferences.user_id == current_user.id)
    )
    prefs = result.scalar_one_or_none()
    if prefs is None:
        raise HTTPException(status_code=404, detail="Preferences not found")

    if body.unit_system is not None:
        prefs.unit_system = body.unit_system
    if body.theme is not None:
        prefs.theme = body.theme
    prefs.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(prefs)
    return prefs


@router.get("/favorites", response_model=list[FavoriteOut])
async def list_favorites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[FavoriteOut]:
    """
    Retourne les villes favorites de l'utilisateur, ordonnées par position.

    Args:
        current_user (User): Utilisateur authentifié.
        db (AsyncSession): Session de base de données.

    Returns:
        list[FavoriteOut]: Liste des favoris triée par position croissante.
    """
    result = await db.execute(
        select(Favorite)
        .where(Favorite.user_id == current_user.id)
        .order_by(Favorite.position)
    )
    return list(result.scalars().all())


@router.post("/favorites", response_model=FavoriteOut, status_code=status.HTTP_201_CREATED)
async def add_favorite(
    body: FavoriteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FavoriteOut:
    """
    Ajoute une ville en favori à la fin de la liste de l'utilisateur.

    Args:
        body (FavoriteCreate): Nom de la ville et coordonnées GPS.
        current_user (User): Utilisateur authentifié.
        db (AsyncSession): Session de base de données.

    Returns:
        FavoriteOut: Favori créé avec son id et sa position.
    """
    # Calcul de la prochaine position pour maintenir l'ordre d'ajout
    result = await db.execute(
        select(Favorite)
        .where(Favorite.user_id == current_user.id)
        .order_by(Favorite.position.desc())
    )
    last = result.scalars().first()
    next_position = (last.position + 1) if last else 0

    fav = Favorite(
        user_id=current_user.id,
        city_name=body.city_name,
        lat=body.lat,
        lon=body.lon,
        position=next_position,
    )
    db.add(fav)
    await db.commit()
    await db.refresh(fav)
    return fav


@router.delete("/favorites/{favorite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_favorite(
    favorite_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Supprime un favori appartenant à l'utilisateur connecté.

    Args:
        favorite_id (UUID): Identifiant du favori à supprimer.
        current_user (User): Utilisateur authentifié.
        db (AsyncSession): Session de base de données.

    Raises:
        HTTPException: 404 si le favori n'existe pas ou n'appartient pas à l'utilisateur.
    """
    result = await db.execute(
        select(Favorite).where(
            Favorite.id == favorite_id,
            Favorite.user_id == current_user.id,
        )
    )
    fav = result.scalar_one_or_none()
    if fav is None:
        raise HTTPException(status_code=404, detail="Favorite not found")
    await db.delete(fav)
    await db.commit()


@router.put("/favorites/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_favorites(
    body: FavoriteReorderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Met à jour les positions de plusieurs favoris en une seule requête.

    Args:
        body (FavoriteReorderRequest): Liste de paires {id, position}.
        current_user (User): Utilisateur authentifié.
        db (AsyncSession): Session de base de données.

    Raises:
        HTTPException: 404 si un ou plusieurs favoris sont introuvables ou n'appartiennent pas à l'utilisateur.
    """
    ids = [item.id for item in body.items]
    result = await db.execute(
        select(Favorite).where(
            Favorite.id.in_(ids),
            Favorite.user_id == current_user.id,
        )
    )
    favs = {fav.id: fav for fav in result.scalars().all()}

    if len(favs) != len(ids):
        raise HTTPException(status_code=404, detail="One or more favorites not found")

    for item in body.items:
        favs[item.id].position = item.position

    await db.commit()
