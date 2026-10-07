from typing import Any

from psycopg import Connection

_LIST_ALL = """
SELECT id, title, weight
FROM question
ORDER BY display_order
"""


class QuestionRepository:
    def __init__(self, conn: Connection) -> None:
        self._conn = conn

    def list_all(self) -> list[dict[str, Any]]:
        return self._conn.execute(_LIST_ALL).fetchall()
