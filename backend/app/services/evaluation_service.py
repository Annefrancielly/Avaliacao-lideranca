"""Regras de negócio das avaliações.

O serviço depende de "portas" (Protocols), não das classes concretas de
repositório. Assim ele pode ser testado com implementações em memória,
sem banco de dados.
"""
from typing import Any, Protocol

from app.errors import ForbiddenError, InvalidEvaluationError
from app.schemas import (
    AnswerOut,
    EvaluationCreate,
    EvaluationOut,
    LastEvaluation,
    TeamMember,
)
from app.services.scoring import weighted_score


class EmployeePort(Protocol):
    def is_in_team(self, viewer_id: int, employee_id: int) -> bool: ...
    def list_team(self, viewer_id: int) -> list[dict[str, Any]]: ...


class QuestionPort(Protocol):
    def list_all(self) -> list[dict[str, Any]]: ...


class EvaluationPort(Protocol):
    def create(
        self,
        evaluator_id: int,
        evaluated_id: int,
        final_score: Any,
        answers: list[tuple[int, int, int]],
    ) -> dict[str, Any]: ...

    def list_visible_history(self, viewer_id: int, employee_id: int) -> list[dict[str, Any]]: ...


class EvaluationService:
    def __init__(
        self,
        employees: EmployeePort,
        questions: QuestionPort,
        evaluations: EvaluationPort,
    ) -> None:
        self._employees = employees
        self._questions = questions
        self._evaluations = evaluations

    # ------------------------------------------------------------------
    # Consultas
    # ------------------------------------------------------------------
    def list_team(self, viewer_id: int) -> list[TeamMember]:
        members = []
        for row in self._employees.list_team(viewer_id):
            last = None
            if row["last_evaluation_id"] is not None:
                last = LastEvaluation(
                    id=row["last_evaluation_id"],
                    final_score=row["last_final_score"],
                    created_at=row["last_created_at"],
                    evaluator_name=row["last_evaluator_name"],
                )
            members.append(
                TeamMember(
                    id=row["id"],
                    name=row["name"],
                    email=row["email"],
                    position_name=row["position_name"],
                    depth=row["depth"],
                    is_direct=row["depth"] == 1,
                    direct_leaders=row["direct_leaders"],
                    last_evaluation=last,
                    evaluated_by_me_this_week=row["evaluated_by_me_this_week"],
                )
            )
        return members

    def history(self, viewer_id: int, employee_id: int) -> list[EvaluationOut]:
        self._ensure_in_team(viewer_id, employee_id)
        rows = self._evaluations.list_visible_history(viewer_id, employee_id)
        return [EvaluationOut(**row) for row in rows]

    # ------------------------------------------------------------------
    # Comando
    # ------------------------------------------------------------------
    def submit(self, evaluator: dict[str, Any], payload: EvaluationCreate) -> EvaluationOut:
        # 1) Autorização: só é possível avaliar quem está na própria hierarquia.
        #    Isso também impede a autoavaliação, pois o líder não pertence ao
        #    próprio time.
        self._ensure_in_team(evaluator["id"], payload.evaluated_id)

        # 2) Completude: exatamente uma resposta para cada pergunta cadastrada.
        questions = {q["id"]: q for q in self._questions.list_all()}
        scores = self._collect_scores(payload, set(questions))

        # 3) Nota final ponderada, calculada no servidor (fonte da verdade).
        weights = {qid: q["weight"] for qid, q in questions.items()}
        final_score = weighted_score(scores, weights)

        # 4) Persistência atômica. A regra "1 por semana" é garantida pela
        #    constraint única do banco e chega aqui como erro de domínio.
        created = self._evaluations.create(
            evaluator_id=evaluator["id"],
            evaluated_id=payload.evaluated_id,
            final_score=final_score,
            answers=[(qid, scores[qid], weights[qid]) for qid in questions],
        )

        return EvaluationOut(
            id=created["id"],
            evaluator_id=evaluator["id"],
            evaluator_name=evaluator["name"],
            evaluated_id=payload.evaluated_id,
            final_score=created["final_score"],
            week_start=created["week_start"],
            created_at=created["created_at"],
            answers=[
                AnswerOut(
                    question_id=qid,
                    title=q["title"],
                    weight=q["weight"],
                    score=scores[qid],
                )
                for qid, q in questions.items()
            ],
        )

    # ------------------------------------------------------------------
    # Auxiliares
    # ------------------------------------------------------------------
    def _ensure_in_team(self, viewer_id: int, employee_id: int) -> None:
        if not self._employees.is_in_team(viewer_id, employee_id):
            raise ForbiddenError(
                "Este funcionário não faz parte da sua hierarquia de liderados."
            )

    @staticmethod
    def _collect_scores(payload: EvaluationCreate, expected_ids: set[int]) -> dict[int, int]:
        scores: dict[int, int] = {}
        for answer in payload.answers:
            if answer.question_id in scores:
                raise InvalidEvaluationError(
                    f"A pergunta {answer.question_id} foi respondida mais de uma vez."
                )
            scores[answer.question_id] = answer.score

        unknown = set(scores) - expected_ids
        if unknown:
            raise InvalidEvaluationError(
                f"Perguntas inexistentes: {sorted(unknown)}."
            )

        missing = expected_ids - set(scores)
        if missing:
            raise InvalidEvaluationError(
                f"Todas as perguntas são obrigatórias. Faltando: {sorted(missing)}."
            )
        return scores
