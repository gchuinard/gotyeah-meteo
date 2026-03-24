from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    owm_api_key: str = ""
    cache_ttl_seconds: int = 600  # 10 minutes

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()
