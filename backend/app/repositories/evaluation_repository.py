from decimal import Decimal
from typing import Any

from psycopg import Connection, errors

from app.errors import EvaluationAlreadyExistsError
from app.repositories.hierarchy_sql import SUBORDINATE_TREE_CTE

_INSERT_EVALUATION = """
INSERT INTO evaluation (evaluator_id, evaluated_id, final_score)
VALUES (%(evaluator_id)s, %(evaluated_id)s, %(final_score)s)
RETURNING id, week_start, created_at, final_score::float8 AS final_score
"""

_INSERT_ANSWER = """
INSERT INTO evaluation_answer (evaluation_id, question_id, score, weight)
VALUES (%s, %s, %s, %s)
"""

# Histórico visível: mesma regra de visibilidade da listagem do time.
# json_agg monta as respostas de cada avaliação em uma única ida ao banco
# (evita o problema N+1 de buscar as respostas avaliação por avaliação).
_LIST_VISIBLE_HISTORY = SUBORDINATE_TREE_CTE + """
SELECT
    ev.id,
    ev.evaluator_id,
    evaluator.name           AS evaluator_name,
    ev.evaluated_id,
    ev.final_score::float8   AS final_score,
    ev.week_start,
    ev.created_at,
    json_agg(
        json_build_object(
            'question_id', q.id,
            'title',       q.title,
            'weight',      ea.weight,
            'score',       ea.score
        ) ORDER BY q.display_order
    ) AS answers
FROM evaluation ev
JOIN employee evaluator   ON evaluator.id = ev.evaluator_id
JOIN evaluation_answer ea ON ea.evaluation_id = ev.id
JOIN question q           ON q.id = ea.question_id
WHERE ev.evaluated_id = %(employee_id)s
  AND ev.evaluator_id IN (SELECT employee_id FROM visible_evaluator)
GROUP BY ev.id, evaluator.name
ORDER BY ev.created_at DESC
"""


class EvaluationRepository:
    def __init__(self, conn: Connection) -> None:
        self._conn = conn

    def create(
        self,
        evaluator_id: int,
        evaluated_id: int,
        final_score: Decimal,
        answers: list[tuple[int, int, int]],
    ) -> dict[str, Any]:
        """Grava cabeçalho + respostas de forma atômica.

        answers: lista de (question_id, score, weight).
        """
        try:
            with self._conn.transaction():
                with self._conn.cursor() as cur:
                    cur.execute(
                        _INSERT_EVALUATION,
                        {
                            "evaluator_id": evaluator_id,
                            "evaluated_id": evaluated_id,
                            "final_score": final_score,
                        },
                    )
                    created = cur.fetchone()
                    cur.executemany(
                        _INSERT_ANSWER,
                        [(created["id"], qid, score, weight) for qid, score, weight in answers],
                    )
        except errors.UniqueViolation as exc:
            # A constraint uq_evaluation_pair_week é a fonte da verdade da
            # regra semanal; aqui apenas traduzimos para um erro de domínio.
            raise EvaluationAlreadyExistsError(
                "Você já avaliou este funcionário nesta semana. "
                "Uma nova avaliação poderá ser feita a partir da próxima segunda-feira."
            ) from exc
        return created

    def list_visible_history(self, viewer_id: int, employee_id: int) -> list[dict[str, Any]]:
        return self._conn.execute(
            _LIST_VISIBLE_HISTORY,
            {"viewer_id": viewer_id, "employee_id": employee_id},
        ).fetchall()
