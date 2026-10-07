"""Testes das regras de negócio com repositórios em memória (sem banco)."""
from datetime import date, datetime, timezone
from decimal import Decimal

import pytest

from app.errors import (
    EvaluationAlreadyExistsError,
    ForbiddenError,
    InvalidEvaluationError,
)
from app.schemas import AnswerIn, EvaluationCreate
from app.services.evaluation_service import EvaluationService

QUESTIONS = [
    {"id": 1, "title": "Entrega de Resultados", "weight": 25},
    {"id": 2, "title": "Execução e Qualidade do Trabalho", "weight": 20},
    {"id": 3, "title": "Capacidade de Aprendizado e Desenvolvimento", "weight": 20},
    {"id": 4, "title": "Resolução de Problemas e Pensamento Crítico", "weight": 15},
    {"id": 5, "title": "Colaboração, Influência e Liderança", "weight": 10},
    {"id": 6, "title": "Visão Estratégica e Potencial de Crescimento", "weight": 10},
]

HIERARCHY = {2: [4], 4: [8], 8: [10]}

BOB = {"id": 2, "name": "Bob Sinclair"}
DAVID = {"id": 4, "name": "David Okafor"}


class FakeEmployees:
    def is_in_team(self, viewer_id: int, employee_id: int) -> bool:
        pending, seen = list(HIERARCHY.get(viewer_id, [])), set()
        while pending:
            current = pending.pop()
            if current in seen:
                continue
            seen.add(current)
            pending.extend(HIERARCHY.get(current, []))
        return employee_id in seen and employee_id != viewer_id

    def list_team(self, viewer_id: int) -> list[dict]:
        return []


class FakeQuestions:
    def list_all(self) -> list[dict]:
        return QUESTIONS


class FakeEvaluations:
    """Simula a constraint única (avaliador, avaliado, semana)."""

    def __init__(self) -> None:
        self.saved: list[dict] = []

    def create(self, evaluator_id, evaluated_id, final_score, answers):
        week = date(2026, 10, 5)
        if any(
            e["evaluator_id"] == evaluator_id and e["evaluated_id"] == evaluated_id
            for e in self.saved
        ):
            raise EvaluationAlreadyExistsError("já avaliado nesta semana")
        record = {
            "id": len(self.saved) + 1,
            "evaluator_id": evaluator_id,
            "evaluated_id": evaluated_id,
            "final_score": float(final_score),
            "week_start": week,
            "created_at": datetime(2026, 10, 6, 12, 0, tzinfo=timezone.utc),
            "answers": answers,
        }
        self.saved.append(record)
        return record

    def list_visible_history(self, viewer_id, employee_id):
        return []


@pytest.fixture
def evaluations() -> FakeEvaluations:
    return FakeEvaluations()


@pytest.fixture
def service(evaluations: FakeEvaluations) -> EvaluationService:
    return EvaluationService(FakeEmployees(), FakeQuestions(), evaluations)


def payload(evaluated_id: int, scores: dict[int, int]) -> EvaluationCreate:
    return EvaluationCreate(
        evaluated_id=evaluated_id,
        answers=[AnswerIn(question_id=qid, score=s) for qid, s in scores.items()],
    )


ALL_THREES = {q["id"]: 3 for q in QUESTIONS}


def test_leader_can_evaluate_direct_subordinate(service, evaluations):
    result = service.submit(BOB, payload(4, ALL_THREES))
    assert result.final_score == 3.0
    assert len(result.answers) == len(QUESTIONS)
    # O peso vigente é gravado junto com cada resposta
    assert evaluations.saved[0]["answers"][0] == (1, 3, 25)


def test_leader_can_evaluate_indirect_subordinate(service):
    assert service.submit(BOB, payload(10, ALL_THREES)).evaluated_id == 10


def test_both_leaders_can_evaluate_the_same_employee_in_the_same_week(service):
    service.submit(DAVID, payload(8, ALL_THREES))
    assert service.submit(BOB, payload(8, ALL_THREES)).evaluator_id == BOB["id"]


def test_cannot_evaluate_superior_peer_or_self(service):
    for target in (2, 5, 4): 
        with pytest.raises(ForbiddenError):
            service.submit(DAVID, payload(target, ALL_THREES))


def test_second_evaluation_in_same_week_is_rejected(service):
    service.submit(BOB, payload(4, ALL_THREES))
    with pytest.raises(EvaluationAlreadyExistsError):
        service.submit(BOB, payload(4, ALL_THREES))


def test_all_questions_are_required(service):
    incomplete = {1: 4, 2: 4}
    with pytest.raises(InvalidEvaluationError):
        service.submit(BOB, payload(4, incomplete))


def test_unknown_question_is_rejected(service):
    with pytest.raises(InvalidEvaluationError):
        service.submit(BOB, payload(4, {**ALL_THREES, 99: 2}))


def test_duplicated_answer_is_rejected(service):
    answers = [AnswerIn(question_id=q["id"], score=3) for q in QUESTIONS]
    answers.append(AnswerIn(question_id=1, score=4))
    with pytest.raises(InvalidEvaluationError):
        service.submit(BOB, EvaluationCreate(evaluated_id=4, answers=answers))


@pytest.mark.parametrize("invalid_score", [0, 5])
def test_scores_outside_one_to_four_are_rejected_by_schema(invalid_score):
    with pytest.raises(ValueError):
        AnswerIn(question_id=1, score=invalid_score)


def test_history_of_non_subordinate_is_forbidden(service):
    with pytest.raises(ForbiddenError):
        service.history(DAVID["id"], 2)


def test_final_score_uses_weights(service):
    scores = {1: 4, 2: 3, 3: 3, 4: 2, 5: 2, 6: 1}
    assert service.submit(BOB, payload(4, scores)).final_score == float(Decimal("2.80"))
