"""
Module : admin.py
Rôle   : Endpoints du back-office admin — consultation des utilisateurs, favoris et tables SQL.
         L'accès est restreint aux emails listés dans la variable d'env ADMIN_EMAILS.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import inspect, select, text, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.base import get_db
from app.db.models import Favorite, Preferences, RefreshToken, User
from app.routers.auth import get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Dépendance — vérifie que l'utilisateur connecté est admin
# ---------------------------------------------------------------------------

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.email not in settings.admin_emails:
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

    class Config:
        from_attributes = True


class AdminUserOut(BaseModel):
    id: str
    email: str
    username: str | None
    created_at: str
    theme: str | None
    favorites: list[AdminFavoriteOut]

    class Config:
        from_attributes = True


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

@router.get("/users", response_model=list[AdminUserOut])
async def list_users(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[AdminUserOut]:
    result = await db.execute(
        select(User).order_by(User.created_at.desc())
    )
    users = result.scalars().all()

    out = []
    for u in users:
        favs_result = await db.execute(
            select(Favorite).where(Favorite.user_id == u.id).order_by(Favorite.position)
        )
        favs = favs_result.scalars().all()

        prefs_result = await db.execute(
            select(Preferences).where(Preferences.user_id == u.id)
        )
        prefs = prefs_result.scalar_one_or_none()

        out.append(AdminUserOut(
            id=str(u.id),
            email=u.email,
            username=u.username,
            created_at=u.created_at.isoformat(),
            theme=prefs.theme if prefs else None,
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
    user_id: str,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
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
