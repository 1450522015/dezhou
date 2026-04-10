"""牌力估计（纯规则，不依赖 FastAPI）。"""

from typing import List

from src.infrastructure.deuces_adapter import convert_card_strings, make_evaluator


def estimate_strength(my_hand: List[str], board: List[str]) -> float:
    if len(my_hand) != 2:
        return 0.0
    evaluator = make_evaluator()
    score = evaluator.evaluate(convert_card_strings(board), convert_card_strings(my_hand))
    rank_class = evaluator.get_rank_class(score)
    return max(0.0, min(1.0, (10 - rank_class) / 9.0))
