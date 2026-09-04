from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    app_name: str = "Jolly AI"
    app_env: str = "development"
    secret_key: str = "dev-only-change-me"
    encryption_key: str = ""
    access_token_expire_minutes: int = 480
    database_url: str = "sqlite:///./data/app.db"
    cors_origins: str = "http://localhost:3000"
    demo_counselor_email: str = "counselor@jolly.demo"
    demo_counselor_password: str = "change-me-counselor"
    demo_admin_email: str = "admin@jolly.demo"
    demo_admin_password: str = "change-me-admin"
    whisper_api_url: str = ""
    whisper_api_key: str = ""
    tts_api_url: str = ""
    tts_api_key: str = ""
    chroma_path: str = "./data/chroma"
    use_chroma: bool = False
    legal_share_protocol: bool = False
    nvidia_api_key: str = ""
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_model: str = "meta/llama-3.2-11b-vision-instruct"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
