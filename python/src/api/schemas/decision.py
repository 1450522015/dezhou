from typing import Dict

from pydantic import BaseModel


class DecisionRequest(BaseModel):
    gameState: Dict
    playerId: str
    simulations: int = 300
