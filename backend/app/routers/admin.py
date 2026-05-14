"""
Module : admin.py
Rôle   : Endpoints du back-office admin — consultation des utilisateurs, favoris et tables SQL.
         L'accès est restreint aux emails listés dans la variable d'env ADMIN_EMAILS.

Dépendances notables :
  - get_current_user : dépendance auth partagée depuis app.routers.auth
  - sqlalchemy       : agrégats et inspection des tables exposées au back-office
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.db.base import get_db
from app.db.models import Favorite, Preferences, RefreshToken, User
from app.routers.auth import get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Dépendance — vérifie que l'utilisateur connecté est admin
# ---------------------------------------------------------------------------

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.email not in settings.admin_emails_list:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# ---------------------------------------------------------------------------
# Schemas de réponse
# ---------------------------------------------------------------------------

class AdminFavoriteOut(BaseModel):
    id: str
    city_name: str
    lat: float
    lon: float
    position: int
    created_at: str


class AdminUserOut(BaseModel):
    id: str
    email: str
    username: str | None
    created_at: str
    theme: str | None
    favorites: list[AdminFavoriteOut]


class TableRow(BaseModel):
    data: list[dict]
    total: int


class TablesOverview(BaseModel):
    users: TableRow
    favorites: TableRow
    preferences: TableRow
    refresh_tokens: TableRow


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/ping")
async def ping(_: User = Depends(require_admin)) -> dict:
    return {"is_admin": True}


@router.get("/users", response_model=list[AdminUserOut])
async def list_users(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[AdminUserOut]:
    # selectinload : charge favoris + préférences en 2 requêtes groupées au lieu de 2N+1
    result = await db.execute(
        select(User)
        .options(selectinload(User.favorites), selectinload(User.preferences))
        .order_by(User.created_at.desc())
    )
    users = result.scalars().all()

    out = []
    for u in users:
        favs = sorted(u.favorites, key=lambda f: f.position)
        out.append(AdminUserOut(
            id=str(u.id),
            email=u.email,
            username=u.username,
            created_at=u.created_at.isoformat(),
            theme=u.preferences.theme if u.preferences else None,
            favorites=[
                AdminFavoriteOut(
                    id=str(f.id),
                    city_name=f.city_name,
                    lat=f.lat,
                    lon=f.lon,
                    position=f.position,
                    created_at=f.created_at.isoformat(),
                )
                for f in favs
            ],
        ))
    return out


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()


@router.delete("/favorites/{favorite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_favorite(
    favorite_id: uuid.UUID,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(Favorite).where(Favorite.id == favorite_id))
    fav = result.scalar_one_or_none()
    if fav is None:
        raise HTTPException(status_code=404, detail="Favorite not found")
    await db.delete(fav)
    await db.commit()


@router.get("/tables", response_model=TablesOverview)
async def get_tables(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> TablesOverview:
    async def fetch_table(model, columns: list[str]) -> TableRow:
        count_result = await db.execute(select(func.count()).select_from(model))
        total = count_result.scalar_one()
        rows_result = await db.execute(select(model).limit(100))
        rows = rows_result.scalars().all()
        data = []
        for row in rows:
            entry = {}
            for col in columns:
                val = getattr(row, col, None)
                entry[col] = str(val) if val is not None else None
            data.append(entry)
        return TableRow(data=data, total=total)

    users_table = await fetch_table(User, ["id", "email", "username", "created_at"])
    favorites_table = await fetch_table(Favorite, ["id", "user_id", "city_name", "lat", "lon", "position", "created_at"])
    preferences_table = await fetch_table(Preferences, ["user_id", "unit_system", "theme", "updated_at"])
    tokens_table = await fetch_table(RefreshToken, ["id", "user_id", "expires_at", "revoked_at", "created_at"])

    return TablesOverview(
        users=users_table,
        favorites=favorites_table,
        preferences=preferences_table,
        refresh_tokens=tokens_table,
    )
