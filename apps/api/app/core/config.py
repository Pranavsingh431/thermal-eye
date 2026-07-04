"""Application settings, loaded from environment via pydantic-settings."""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore", case_sensitive=False
    )

    # --- Core ---
    environment: str = "development"
    project_name: str = "ThermalEye"
    api_v1_prefix: str = "/api/v1"

    # --- Database ---
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/thermaleye"
    database_url_sync: str = "postgresql+psycopg://postgres:postgres@localhost:5432/thermaleye"
    db_echo: bool = False

    # --- Auth ---
    secret_key: str = "change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14

    # --- CORS ---  (NoDecode: parse our comma-separated form, not JSON)
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000"]
    )

    # --- OpenRouter ---
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_vision_model: str = "google/gemini-2.5-flash"
    openrouter_text_model: str = "anthropic/claude-sonnet-4"
    openrouter_app_url: str = "https://thermaleye.app"
    openrouter_app_title: str = "ThermalEye"

    # --- Supabase Storage ---
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "thermaleye"

    # --- Email ---
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "ThermalEye Alerts <alerts@thermaleye.app>"
    default_alert_recipient: str = "singhpranav431@gmail.com"

    # --- Weather (optional ambient enrichment) ---
    weather_api_key: str = ""

    # --- Uploads ---
    max_upload_bytes: int = 15 * 1024 * 1024  # 15 MB per image
    allowed_image_types: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["image/jpeg", "image/png", "image/webp"]
    )

    @field_validator("cors_origins", "allowed_image_types", mode="before")
    @classmethod
    def _split_csv(cls, v: object) -> object:
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
