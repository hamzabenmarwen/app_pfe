from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    PORT: int = 8000
    CATALOG_DATABASE_URL: str = ""
    ORDER_DATABASE_URL: str = ""
    GOOGLE_API_KEY: str = ""
    FRONTEND_URL: str = "http://localhost:5173"
    JWT_ACCESS_SECRET: str = ""
    SITE_NAME: str = "Assiette Gala"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
