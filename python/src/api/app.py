from fastapi import FastAPI

from src.api.routes import ai_decision, health


def create_app() -> FastAPI:
    application = FastAPI(title="dezhou-python-service")
    application.include_router(health.router)
    application.include_router(ai_decision.router)
    return application


app = create_app()
