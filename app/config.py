from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ivr_database_url: str
    platform_database_url: str

    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # OWASP-recommended Argon2id parameters
    argon2_time_cost: int = 3
    argon2_memory_cost: int = 65536
    argon2_parallelism: int = 4

    login_rate_limit: str = "5/15minutes"

    # Comma-separated list of origins allowed to call the API cross-origin
    # (the Cloudflare Pages frontend). The home deployment serves the built
    # frontend from the same origin and doesn't need CORS.
    cors_origins: str = (
        "https://axa-mansard-survey.pages.dev,"
        "http://localhost:5173,"
        "http://127.0.0.1:5173"
    )

    # The IVR database stores naive local wall-clock times (Africa/Lagos for
    # AXA Mansard). API boundaries are proper UTC ISO-8601; stored values are
    # converted across this zone so timestamps render exactly as stored.
    ivr_database_timezone: str = "Africa/Lagos"


settings = Settings()
