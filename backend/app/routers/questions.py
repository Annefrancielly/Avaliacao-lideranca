from fastapi import APIRouter

from app.dependencies import ConnectionDep
from app.repositories.question_repository import QuestionRepository
from app.schemas import Question

router = APIRouter(tags=["Perguntas"])


@router.get("/questions", response_model=list[Question], summary="Lista perguntas e pesos")
def list_questions(conn: ConnectionDep) -> list[dict]:
    return QuestionRepository(conn).list_all()
