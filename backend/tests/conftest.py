"""
Module : conftest.py
Rôle   : Fixtures pytest — base SQLite en mémoire isolée par test et client HTTP ASGI.

Dépendances notables :
  - aiosqlite  : driver SQLite async pour la base de test en mémoire
  - StaticPool : garde une connexion unique pour que la base :memory: persiste entre sessions
"""

import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base, get_db
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# StaticPool + check_same_thread : sans cela chaque connexion ouvrirait une base
# :memory: distincte et les tables créées seraient invisibles aux requêtes des tests
engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def override_get_db():
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture(autouse=True)
async def create_tables():
    """Recrée un schéma vierge avant chaque test — garantit l'isolation."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture()
async def client():
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()
