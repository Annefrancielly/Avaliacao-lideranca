"""Cálculo da nota final ponderada.

Fórmula: soma(nota_i * peso_i) / soma(peso_i)

Como as notas vão de 1 a 4, o resultado também fica entre 1.00 e 4.00,
o que mantém a nota final na mesma escala que o líder usou para responder.
"""
from collections.abc import Mapping
from decimal import ROUND_HALF_UP, Decimal

_TWO_PLACES = Decimal("0.01")


def weighted_score(scores: Mapping[int, int], weights: Mapping[int, int]) -> Decimal:
    """scores e weights são indexados pelo id da pergunta."""
    total_weight = sum(weights.values())
    if total_weight <= 0:
        raise ValueError("A soma dos pesos deve ser positiva.")

    weighted_sum = sum(scores[question_id] * weight for question_id, weight in weights.items())
    # Decimal evita erros de ponto flutuante (ex.: 2.675 -> 2.67 em float).
    return (Decimal(weighted_sum) / Decimal(total_weight)).quantize(
        _TWO_PLACES, rounding=ROUND_HALF_UP
    )
