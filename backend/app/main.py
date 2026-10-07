from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import create_pool
from app.dependencies import ConnectionDep
from app.errors import (
    DomainError,
    EvaluationAlreadyExistsError,
    ForbiddenError,
    InvalidEvaluationError,
    NotIdentifiedError,
)
from app.routers import employees, evaluations, questions

'''
Criado por: Anne Francielly Siqueira 
Contato: anne.epde05@gmail.com
'''
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.pool = create_pool(settings.database_url)
    yield
    app.state.pool.close()


app = FastAPI(
    title="Avaliação de Liderados",
    version="1.0.0",
    description=(
        "API para líderes avaliarem os funcionários da sua hierarquia. "
        "Identifique o líder pelo cabeçalho X-Employee-Id."
    ),
    lifespan=lifespan,
    # Documentação também acessível pelo proxy do front (/api/docs)
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Employee-Id"],
)

# Tradução centralizada: erro de domínio -> status HTTP
_STATUS_BY_ERROR: dict[type[DomainError], int] = {
    NotIdentifiedError: 401,
    ForbiddenError: 403,
    EvaluationAlreadyExistsError: 409,
    InvalidEvaluationError: 422,
}


@app.exception_handler(DomainError)
async def handle_domain_error(_: Request, exc: DomainError) -> JSONResponse:
    status_code = _STATUS_BY_ERROR.get(type(exc), 400)
    return JSONResponse(status_code=status_code, content={"detail": exc.message})


for module in (employees, questions, evaluations):
    app.include_router(module.router, prefix="/api")


@app.get("/api/health", tags=["Infraestrutura"], summary="Verifica API e banco")
def health(conn: ConnectionDep) -> dict[str, str]:
    conn.execute("SELECT 1")
    return {"status": "ok"}
