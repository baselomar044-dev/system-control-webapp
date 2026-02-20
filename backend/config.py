import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production-supersecret-key-32chars")
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

API_PORT: int = int(os.getenv("API_PORT", "8000"))
API_HOST: str = os.getenv("API_HOST", "0.0.0.0")

OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

ALLOWED_ORIGINS: list[str] = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000",
).split(",")

DEFAULT_ADMIN_PASSWORD: str = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")
DEFAULT_ADMIN_USERNAME: str = os.getenv("DEFAULT_ADMIN_USERNAME", "admin")

USERS_FILE: str = os.getenv("USERS_FILE", "users.json")
COMMAND_HISTORY_FILE: str = os.getenv("COMMAND_HISTORY_FILE", "command_history.json")

SCREENSHOT_DIR: str = os.getenv("SCREENSHOT_DIR", "screenshots")
MAX_SCREENSHOT_AGE_SECONDS: int = int(os.getenv("MAX_SCREENSHOT_AGE_SECONDS", "3600"))

RATE_LIMIT_DEFAULT: str = os.getenv("RATE_LIMIT_DEFAULT", "60/minute")
RATE_LIMIT_COMMANDS: str = os.getenv("RATE_LIMIT_COMMANDS", "30/minute")
RATE_LIMIT_AUTH: str = os.getenv("RATE_LIMIT_AUTH", "10/minute")

OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
AGENT_MAX_ITERATIONS: int = int(os.getenv("AGENT_MAX_ITERATIONS", "10"))
