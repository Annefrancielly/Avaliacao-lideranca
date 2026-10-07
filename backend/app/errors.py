class DomainError(Exception):
    """Base para erros de regra de negócio."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class NotIdentifiedError(DomainError):
    """Nenhum líder válido foi informado na requisição (HTTP 401)."""


class ForbiddenError(DomainError):
    """O líder não tem acesso ao funcionário solicitado (HTTP 403)."""


class InvalidEvaluationError(DomainError):
    """Respostas incompletas, duplicadas ou desconhecidas (HTTP 422)."""


class EvaluationAlreadyExistsError(DomainError):
    """O par líder-funcionário já possui avaliação nesta semana (HTTP 409)."""
