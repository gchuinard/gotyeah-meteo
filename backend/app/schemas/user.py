"""
Module : user.py
Rôle   : Schémas Pydantic des préférences, favoris et profil utilisateur.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class PreferencesOut(BaseModel):
    unit_system: str
    theme: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class PreferencesUpdate(BaseModel):
    # unit_system : JSON sérialisé des préférences d'unités côté front
    unit_system: str | None = Field(None, max_length=255)
    theme: str | None = Field(None, max_length=20)


class ProfileUpdate(BaseModel):
    username: str = Field(min_length=2, max_length=50)


class FavoriteOut(BaseModel):
    id: uuid.UUID
    city_name: str
    lat: float
    lon: float
    position: int
    created_at: datetime

    model_config = {"from_attributes": True}


class FavoriteCreate(BaseModel):
    city_name: str = Field(min_length=1, max_length=100)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class FavoriteReorderItem(BaseModel):
    id: uuid.UUID
    position: int = Field(ge=0)


class FavoriteReorderRequest(BaseModel):
    items: list[FavoriteReorderItem]
