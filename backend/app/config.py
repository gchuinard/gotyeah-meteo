"""
Module : config.py
Rôle   : Centralise la configuration de l'application via les variables d'environnement.

Dépendances notables :
  - pydantic-settings : lecture et validation automatique des variables d'env / fichier .env
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Configuration globale de l'application.

    Attributes:
        owm_api_key (str): Clé API OpenWeatherMap.
        cache_ttl_seconds (int): Durée de vie du cache météo en secondes.
        database_url (str): URL de connexion SQLAlchemy async (asyncpg).
        secret_key (str): Clé secrète pour signer les JWT.
        algorithm (str): Algorithme de signature JWT (HS256 par défaut).
        access_token_expire_minutes (int): Durée de vie de l'access token en minutes.
        refresh_token_expire_days (int): Durée de vie du refresh token en jours.
    """

    # OpenWeatherMap
    owm_api_key: str = ""
    cache_ttl_seconds: int = 600  # 10 minutes

    # Database
    database_url: str = "postgresql+asyncpg://weathernow:changeme@localhost:5432/weathernow"

    # JWT
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        # Ignore les variables docker-compose (POSTGRES_USER, etc.) non déclarées ici
        extra="ignore",
    )


settings = Settings()
