"""
CTEs expostas para a consulta que vier depois:
  * team(employee_id, depth)  -> todos os subordinados diretos e indiretos;
  * visible_evaluator(employee_id) -> o próprio líder + os seus subordinados.

Regra de visibilidade adotada: o líder enxerga avaliações de pessoas do seu
time feitas por ele mesmo ou por alguém abaixo dele. Avaliações feitas por
superiores ou pares ficam ocultas ("respeitando sempre a maior hierarquia").
"""

SUBORDINATE_TREE_CTE = """
WITH RECURSIVE subordinate_tree (employee_id, depth) AS (
    -- Âncora: liderados diretos
    SELECT ll.lead_id, 1
    FROM leader_lead ll
    WHERE ll.leader_id = %(viewer_id)s

    UNION ALL

    -- Passo recursivo: liderados dos liderados
    SELECT ll.lead_id, st.depth + 1
    FROM subordinate_tree st
    JOIN leader_lead ll ON ll.leader_id = st.employee_id
)
-- Proteção contra ciclos (A -> B -> A): o PostgreSQL interrompe o ramo
-- ao revisitar um funcionário no mesmo caminho.
CYCLE employee_id SET is_cycle USING path,

team AS (
    -- Como leader_lead é N:N, um funcionário pode ser alcançado por mais de
    -- um caminho. MIN(depth) mantém a distância mais curta até o líder.
    SELECT employee_id, MIN(depth) AS depth
    FROM subordinate_tree
    WHERE NOT is_cycle
      AND employee_id <> %(viewer_id)s
    GROUP BY employee_id
),

visible_evaluator AS (
    SELECT %(viewer_id)s::int AS employee_id
    UNION
    SELECT employee_id FROM team
)
"""
