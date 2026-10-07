from fastapi import APIRouter, status

from app.dependencies import CurrentEmployeeDep, EvaluationServiceDep
from app.schemas import EvaluationCreate, EvaluationOut, TeamMember

router = APIRouter(tags=["Avaliações"])


@router.get(
    "/team",
    response_model=list[TeamMember],
    summary="Subordinados diretos e indiretos do líder, com a última avaliação visível",
)
def list_team(current: CurrentEmployeeDep, service: EvaluationServiceDep) -> list[TeamMember]:
    return service.list_team(current["id"])


@router.get(
    "/team/{employee_id}/evaluations",
    response_model=list[EvaluationOut],
    summary="Histórico de avaliações visíveis de um liderado (mais recente primeiro)",
)
def list_history(
    employee_id: int, current: CurrentEmployeeDep, service: EvaluationServiceDep
) -> list[EvaluationOut]:
    return service.history(current["id"], employee_id)


@router.post(
    "/evaluations",
    response_model=EvaluationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Registra uma avaliação (imutável, 1 por semana por par líder-funcionário)",
)
def create_evaluation(
    payload: EvaluationCreate, current: CurrentEmployeeDep, service: EvaluationServiceDep
) -> EvaluationOut:
    return service.submit(current, payload)
