"""第三方 deuces 的唯一适配入口。"""

from typing import List

from deuces import Card, Evaluator


def convert_card_strings(cards: List[str]) -> List[int]:
    return [Card.new(c) for c in cards if isinstance(c, str) and len(c) == 2]


def make_evaluator() -> Evaluator:
    return Evaluator()
