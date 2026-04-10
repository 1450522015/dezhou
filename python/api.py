"""对外保留 api:app，供 Uvicorn 与旧引用使用。"""

from src.api.app import app

__all__ = ["app"]
