"""
app/config.py
─────────────
Centralized settings. All env vars validated at startup.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    database_url: str
    supabase_jwt_secret: str = ""

    # LLM & Research
    anthropic_api_key: str = ""
    tavily_api_key: str = ""
    gemini_api_key: str = ""

    # Redis (Upstash)
    redis_url: str = "redis://localhost:6379"

    # SSE stream auth secret
    stream_token_secret: str = "change-me-in-production"

    # App
    frontend_url: str = "http://localhost:3000"
    environment: str = "development"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()
