from collections.abc import Iterator
from typing import Annotated, Any

from fastapi import Depends, Header, Request
from psycopg import Connection

from app.errors import NotIdentifiedError
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.evaluation_repository import EvaluationRepository
from app.repositories.question_repository import QuestionRepository
from app.services.evaluation_service import EvaluationService


def get_connection(request: Request) -> Iterator[Connection]:
    with request.app.state.pool.connection() as conn:
        yield conn


ConnectionDep = Annotated[Connection, Depends(get_connection)]


def get_current_employee(
    conn: ConnectionDep,
    x_employee_id: Annotated[int | None, Header(description="ID do líder que está avaliando")] = None,
) -> dict[str, Any]:
    """Identificação simplificada (sem login), conforme permitido pelo case."""
    if x_employee_id is None:
        raise NotIdentifiedError("Informe o líder no cabeçalho X-Employee-Id.")
    employee = EmployeeRepository(conn).get(x_employee_id)
    if employee is None:
        raise NotIdentifiedError(f"Funcionário {x_employee_id} não encontrado.")
    return employee


CurrentEmployeeDep = Annotated[dict[str, Any], Depends(get_current_employee)]


def get_evaluation_service(conn: ConnectionDep) -> EvaluationService:
    return EvaluationService(
        employees=EmployeeRepository(conn),
        questions=QuestionRepository(conn),
        evaluations=EvaluationRepository(conn),
    )


EvaluationServiceDep = Annotated[EvaluationService, Depends(get_evaluation_service)]
