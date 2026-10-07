"""Pool de conexões com o PostgreSQL (psycopg 3)."""
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool


def create_pool(database_url: str) -> ConnectionPool:
    # cada linha vira um dict {coluna: valor}, o que simplifica bastante o código de acesso ao banco.
    pool = ConnectionPool(
        conninfo=database_url,
        min_size=1,
        max_size=10,
        kwargs={"row_factory": dict_row},
        open=False,
    )
    pool.open(wait=True, timeout=30)
    return pool
