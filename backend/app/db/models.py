"""
Module : models.py
Rôle   : Définit les modèles ORM SQLAlchemy (tables users, preferences, favorites, refresh_tokens).

Dépendances notables :
  - sqlalchemy : mapping ORM vers les tables PostgreSQL
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def _utcnow() -> datetime:
    """Retourne l'heure courante en UTC, utilisée comme valeur par défaut pour les colonnes timestamp."""
    return datetime.now(timezone.utc)


class User(Base):
    """
    Représente un compte utilisateur.

    Attributes:
        id (UUID): Identifiant unique généré automatiquement.
        email (str): Adresse e-mail unique, utilisée comme identifiant de connexion.
        password_hash (str): Hash bcrypt du mot de passe.
        created_at (datetime): Date de création du compte (UTC).
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    username: Mapped[str | None] = mapped_column(String(50), nullable=True, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    preferences: Mapped["Preferences"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    favorites: Mapped[list["Favorite"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Preferences(Base):
    """
    Préférences d'affichage d'un utilisateur (unités, thème).

    Attributes:
        user_id (UUID): Clé primaire et étrangère vers users.id.
        unit_system (str): Préférences d'unités sérialisées en JSON (température, vent, etc.).
        theme (str): Identifiant du thème visuel choisi (ex. "ocean").
        updated_at (datetime): Date de la dernière modification (UTC).
    """

    __tablename__ = "preferences"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    unit_system: Mapped[str] = mapped_column(String(255), default="metric")
    theme: Mapped[str] = mapped_column(String(20), default="ocean")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    user: Mapped["User"] = relationship(back_populates="preferences")


class Favorite(Base):
    """
    Ville favorite enregistrée par un utilisateur.

    Attributes:
        id (UUID): Identifiant unique.
        user_id (UUID): Référence vers l'utilisateur propriétaire.
        city_name (str): Nom de la ville affiché dans l'interface.
        lat (float): Latitude (WGS84).
        lon (float): Longitude (WGS84).
        position (int): Ordre d'affichage dans la liste des favoris.
        created_at (datetime): Date d'ajout (UTC).
    """

    __tablename__ = "favorites"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    city_name: Mapped[str] = mapped_column(String(100), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    user: Mapped["User"] = relationship(back_populates="favorites")


class RefreshToken(Base):
    """
    Refresh token JWT stocké côté serveur pour permettre la révocation.

    Attributes:
        id (UUID): Identifiant unique.
        user_id (UUID): Référence vers l'utilisateur propriétaire.
        token_hash (str): SHA-256 du token brut — on ne stocke jamais le token en clair.
        expires_at (datetime): Date d'expiration (UTC).
        revoked_at (datetime | None): Date de révocation si le token a été invalidé, sinon None.
        created_at (datetime): Date de création (UTC).
    """

    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")
