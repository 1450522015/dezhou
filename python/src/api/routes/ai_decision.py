from fastapi import APIRouter

from src.api.schemas.decision import DecisionRequest
from src.services.decision_service import decide_action

router = APIRouter(tags=["ai"])


@router.post("/ai/decision")
def decision(req: DecisionRequest):
    return decide_action(req.gameState, req.playerId)
