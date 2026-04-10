"""AI 决策：从 Node gameState 映射到行动。"""

from typing import Any, Dict

from src.domain.poker.strength import estimate_strength


def decide_action(game_state: Dict[str, Any], player_id: str) -> Dict[str, Any]:
    state = game_state or {}
    players = state.get("players", [])
    me = next((p for p in players if p.get("id") == player_id), None)
    if not me:
        return {"action": "check", "amount": 0}

    chips = int(me.get("chips", 0) or 0)
    my_bet = int(me.get("bet", 0) or 0)
    highest_bet = int(state.get("highestBet", 0) or 0)
    big_blind = max(1, int(state.get("bigBlind", 20) or 20))
    to_call = max(0, highest_bet - my_bet)
    strength = estimate_strength(me.get("hand", []), state.get("publicCards", []))

    if chips <= 0:
        return {"action": "check", "amount": 0}
    if to_call == 0:
        if strength >= 0.66 and chips > big_blind * 2:
            return {"action": "raise", "amount": min(chips, big_blind * 3)}
        return {"action": "check", "amount": 0}
    if chips <= to_call:
        return {"action": "allin" if strength > 0.62 else "fold", "amount": chips if strength > 0.62 else 0}
    if strength >= 0.74:
        return {"action": "raise", "amount": min(chips, to_call + big_blind * 2)}
    if strength >= 0.45:
        return {"action": "call", "amount": to_call}
    return {"action": "fold", "amount": 0}
