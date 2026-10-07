from fastapi import APIRouter

from app.dependencies import ConnectionDep, CurrentEmployeeDep
from app.repositories.employee_repository import EmployeeRepository
from app.schemas import Employee

router = APIRouter(tags=["Funcionários"])


@router.get("/employees", response_model=list[Employee], summary="Lista todos os funcionários")
def list_employees(conn: ConnectionDep) -> list[dict]:
    """Usado pelo seletor "Avaliando como" (simulação de login)."""
    return EmployeeRepository(conn).list_all()


@router.get("/me", response_model=Employee, summary="Líder identificado na requisição")
def get_me(current: CurrentEmployeeDep) -> dict:
    return current
