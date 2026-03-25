"""
Module : base.py
Rôle   : Initialise le moteur SQLAlchemy async et expose la session de base de données.

Dépendances notables :
  - sqlalchemy[asyncio] : ORM async avec support PostgreSQL via asyncpg
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


engine = create_async_engine(settings.database_url, echo=False, pool_pre_ping=True)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Classe de base commune à tous les modèles SQLAlchemy du projet."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Générateur de session de base de données pour l'injection de dépendance FastAPI.

    Yields:
        AsyncSession: Session SQLAlchemy active, fermée automatiquement après usage.
    """
    async with AsyncSessionLocal() as session:
        yield session
