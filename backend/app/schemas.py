from datetime import date, datetime

from pydantic import BaseModel, Field


class Employee(BaseModel):
    id: int
    name: str
    email: str
    position_name: str


class Question(BaseModel):
    id: int
    title: str
    weight: int


class LastEvaluation(BaseModel):
    id: int
    final_score: float
    created_at: datetime
    evaluator_name: str


class TeamMember(Employee):
    depth: int = Field(description="1 = liderado direto; 2+ = indireto")
    is_direct: bool
    direct_leaders: str | None
    last_evaluation: LastEvaluation | None
    evaluated_by_me_this_week: bool


class AnswerIn(BaseModel):
    question_id: int
    score: int = Field(ge=1, le=4, description="Nota inteira de 1 a 4")


class EvaluationCreate(BaseModel):
    evaluated_id: int
    answers: list[AnswerIn] = Field(min_length=1)


class AnswerOut(BaseModel):
    question_id: int
    title: str
    weight: int
    score: int


class EvaluationOut(BaseModel):
    id: int
    evaluator_id: int
    evaluator_name: str
    evaluated_id: int
    final_score: float
    week_start: date
    created_at: datetime
    answers: list[AnswerOut]
