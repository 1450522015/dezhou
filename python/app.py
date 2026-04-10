import os
import uvicorn

from api import app


if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host=os.getenv("PYTHON_IP", "0.0.0.0"),
        port=int(os.getenv("PYTHON_PORT", "8000")),
        reload=False,
    )
