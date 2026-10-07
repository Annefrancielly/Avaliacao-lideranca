# Arquitetura

## Visão geral

Três serviços em contêineres na mesma rede Docker. O navegador fala apenas com o Nginx, que entrega o front-end e repassa `/api` ao backend. Assim front e API compartilham a mesma origem e não há necessidade de CORS em produção.

```mermaid
flowchart LR
    user([Líder no navegador])

    subgraph compose[Docker Compose - rede app]
        web["web<br/>Nginx + React (build estático)<br/>:8080"]
        api["api<br/>FastAPI + psycopg 3<br/>:8000"]
        db[("db<br/>PostgreSQL 16<br/>:5432")]
    end

    user -- "HTTP /" --> web
    user -- "HTTP /api/* + X-Employee-Id" --> web
    web -- "proxy /api/*" --> api
    api -- "SQL parametrizado" --> db
```

## Camadas do backend

```mermaid
flowchart TB
    routers["routers/<br/>HTTP: rotas, status codes, schemas"]
    deps["dependencies.py<br/>conexão por requisição, líder atual, montagem do serviço"]
    service["services/<br/>regras de negócio + cálculo da nota"]
    repos["repositories/<br/>SQL parametrizado, CTE de hierarquia"]
    db[(PostgreSQL)]

    routers --> deps
    routers --> service
    service --> repos
    repos --> db
```

| Camada | Responsabilidade | Não deve conhecer |
|---|---|---|
| `routers` | Receber a requisição, validar o formato (Pydantic) e devolver a resposta | SQL e regras de negócio |
| `services` | Autorização por hierarquia, completude das respostas, nota ponderada | HTTP e SQL |
| `repositories` | Consultas e gravações no banco | HTTP e regras de negócio |
| `errors.py` + `main.py` | Traduzir erros de domínio para status HTTP em um único ponto | — |

O serviço depende de interfaces (`Protocol`), o que permite testá-lo com repositórios em memória (`backend/tests`).

## Modelo de dados

```mermaid
erDiagram
    employee ||--o{ leader_lead : "lidera (leader_id)"
    employee ||--o{ leader_lead : "é liderado (lead_id)"
    employee ||--o{ evaluation : "avalia (evaluator_id)"
    employee ||--o{ evaluation : "é avaliado (evaluated_id)"
    evaluation ||--|{ evaluation_answer : "possui"
    question ||--o{ evaluation_answer : "responde"

    employee {
        int id PK
        varchar name
        varchar email UK
        varchar position_name
    }
    leader_lead {
        int leader_id PK, FK
        int lead_id PK, FK
    }
    question {
        smallint id PK
        varchar title UK
        smallint weight
        smallint display_order UK
    }
    evaluation {
        bigint id PK
        int evaluator_id FK
        int evaluated_id FK
        date week_start
        numeric final_score
        timestamptz created_at
    }
    evaluation_answer {
        bigint evaluation_id PK, FK
        smallint question_id PK, FK
        smallint score
        smallint weight
    }
```

Restrições relevantes em `evaluation`: `UNIQUE (evaluator_id, evaluated_id, week_start)`, `CHECK (evaluator_id <> evaluated_id)`, `CHECK (final_score BETWEEN 1 AND 4)` e trigger que bloqueia `UPDATE`/`DELETE` (também em `evaluation_answer`).

## Fluxo: envio de uma avaliação

```mermaid
sequenceDiagram
    autonumber
    actor L as Líder
    participant W as React (web)
    participant A as FastAPI (api)
    participant S as EvaluationService
    participant D as PostgreSQL

    L->>W: Responde 6 critérios e confirma
    W->>A: POST /api/evaluations<br/>X-Employee-Id: 2
    A->>D: Busca o líder pelo id (identificação)
    A->>S: submit(líder, payload validado)
    S->>D: CTE recursiva: avaliado pertence ao time?
    alt fora da hierarquia
        S-->>A: ForbiddenError
        A-->>W: 403
    end
    S->>D: Lista perguntas e pesos
    S->>S: Valida completude e calcula nota ponderada
    S->>D: INSERT evaluation + answers (transação)
    alt já existe avaliação do par na semana
        D-->>S: UniqueViolation
        S-->>A: EvaluationAlreadyExistsError
        A-->>W: 409
    else sucesso
        D-->>S: id, week_start, created_at
        S-->>A: EvaluationOut
        A-->>W: 201 + avaliação criada
        W->>W: Invalida cache do time e do histórico
        W-->>L: Exibe o histórico com a nova avaliação
    end
```

## Identificação do líder (sem login)

1. O front-end lista os funcionários em `GET /api/employees` e mostra o seletor "Avaliando como".
2. O id escolhido é salvo em `localStorage` (chave `avaliacao.leaderId`) e enviado em todas as requisições no cabeçalho `X-Employee-Id`.
3. A dependência `get_current_employee` valida o id; ausente ou inexistente resulta em 401.
4. Trocar de líder é trocar o valor no seletor. As chaves de cache do React Query incluem o id do líder, então nenhum dado de um líder aparece para outro.

Em produção, este cabeçalho seria substituído por um token (por exemplo, JWT emitido por um provedor de identidade), sem mudança nas camadas de serviço e repositório: apenas `get_current_employee` passaria a extrair o id do token.

## Decisões técnicas

| Decisão | Motivo |
|---|---|
| PostgreSQL | O dump fornecido já é PostgreSQL (`SERIAL`, `setval`); oferece CTE recursiva com detecção de ciclo (`CYCLE`) e constraints robustas |
| FastAPI | Validação declarativa com Pydantic, OpenAPI gerado automaticamente (documentação de endpoints) e injeção de dependências simples |
| SQL explícito com psycopg 3, sem ORM | A regra central é uma consulta hierárquica recursiva; escrevê-la em SQL deixa a lógica visível, eficiente (uma ida ao banco) e parametrizada |
| Regras críticas também no banco | Limite semanal e imutabilidade continuam válidos mesmo com requisições concorrentes ou acesso direto ao banco |
| React Query | Cache, estados de carregamento/erro e invalidação após o envio sem código manual de sincronização |
| Nginx como proxy reverso | Mesma origem para front e API, sem CORS em produção e com o build estático servido de forma eficiente |
