from decimal import Decimal

import pytest

from app.services.scoring import weighted_score

WEIGHTS = {1: 25, 2: 20, 3: 20, 4: 15, 5: 10, 6: 10}


def test_all_maximum_scores_result_in_four():
    assert weighted_score({qid: 4 for qid in WEIGHTS}, WEIGHTS) == Decimal("4.00")


def test_all_minimum_scores_result_in_one():
    assert weighted_score({qid: 1 for qid in WEIGHTS}, WEIGHTS) == Decimal("1.00")


def test_weights_change_the_result():
    scores = {1: 4, 2: 3, 3: 3, 4: 2, 5: 2, 6: 1}
    assert weighted_score(scores, WEIGHTS) == Decimal("2.80")


def test_rounds_half_up_to_two_places():
    assert weighted_score({1: 2, 2: 3}, {1: 1, 2: 2}) == Decimal("2.67")


def test_rejects_non_positive_total_weight():
    with pytest.raises(ValueError):
        weighted_score({}, {})
