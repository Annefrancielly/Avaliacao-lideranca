from typing import Any

from psycopg import Connection

from app.repositories.hierarchy_sql import SUBORDINATE_TREE_CTE

_LIST_ALL = """
SELECT id, name, email, position_name
FROM employee
ORDER BY name
"""

_GET_BY_ID = """
SELECT id, name, email, position_name
FROM employee
WHERE id = %(employee_id)s
"""

_IS_IN_TEAM = SUBORDINATE_TREE_CTE + """
SELECT EXISTS (
    SELECT 1 FROM team WHERE employee_id = %(employee_id)s
) AS in_team
"""

_LIST_TEAM = SUBORDINATE_TREE_CTE + """
SELECT
    e.id,
    e.name,
    e.email,
    e.position_name,
    t.depth,
    leaders.names                  AS direct_leaders,
    last_eval.id                   AS last_evaluation_id,
    last_eval.final_score          AS last_final_score,
    last_eval.created_at           AS last_created_at,
    last_eval.evaluator_name       AS last_evaluator_name,
    EXISTS (
        SELECT 1
        FROM evaluation mine
        WHERE mine.evaluator_id = %(viewer_id)s
          AND mine.evaluated_id = e.id
          AND mine.week_start   = (date_trunc('week', CURRENT_DATE))::date
    )                              AS evaluated_by_me_this_week
FROM team t
JOIN employee e ON e.id = t.employee_id

-- Nome(s) do(s) líder(es) direto(s) do funcionário
LEFT JOIN LATERAL (
    SELECT string_agg(l.name, ', ' ORDER BY l.name) AS names
    FROM leader_lead ll
    JOIN employee l ON l.id = ll.leader_id
    WHERE ll.lead_id = e.id
) leaders ON TRUE

-- Avaliação mais recente que ESTE líder pode ver
LEFT JOIN LATERAL (
    SELECT ev.id,
           ev.final_score::float8 AS final_score,
           ev.created_at,
           evaluator.name         AS evaluator_name
    FROM evaluation ev
    JOIN employee evaluator ON evaluator.id = ev.evaluator_id
    WHERE ev.evaluated_id = e.id
      AND ev.evaluator_id IN (SELECT employee_id FROM visible_evaluator)
    ORDER BY ev.created_at DESC
    LIMIT 1
) last_eval ON TRUE

ORDER BY t.depth, e.name
"""


class EmployeeRepository:
    def __init__(self, conn: Connection) -> None:
        self._conn = conn

    def list_all(self) -> list[dict[str, Any]]:
        return self._conn.execute(_LIST_ALL).fetchall()

    def get(self, employee_id: int) -> dict[str, Any] | None:
        return self._conn.execute(
            _GET_BY_ID, {"employee_id": employee_id}
        ).fetchone()

    def is_in_team(self, viewer_id: int, employee_id: int) -> bool:
        row = self._conn.execute(
            _IS_IN_TEAM, {"viewer_id": viewer_id, "employee_id": employee_id}
        ).fetchone()
        return bool(row and row["in_team"])

    def list_team(self, viewer_id: int) -> list[dict[str, Any]]:
        return self._conn.execute(_LIST_TEAM, {"viewer_id": viewer_id}).fetchall()
