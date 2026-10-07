# Documentação da API

Base URL: `http://localhost:8080/api` (via Nginx) ou `http://localhost:8000/api` (direto no backend).

Documentação interativa (OpenAPI/Swagger), gerada automaticamente: `http://localhost:8080/api/docs`.

## Identificação

Os endpoints marcados com 🔑 exigem o cabeçalho:

```
X-Employee-Id: <id do líder>
```

## Resumo

| Método | Rota | 🔑 | Descrição |
|---|---|---|---|
| GET | `/health` | | Verifica API e conexão com o banco |
| GET | `/employees` | | Lista todos os funcionários (seletor de líder) |
| GET | `/me` | 🔑 | Dados do líder identificado |
| GET | `/questions` | | Perguntas e pesos |
| GET | `/team` | 🔑 | Subordinados diretos e indiretos, com a última avaliação visível |
| GET | `/team/{employee_id}/evaluations` | 🔑 | Histórico visível de um liderado, com respostas |
| POST | `/evaluations` | 🔑 | Registra uma avaliação |

## Erros

Todas as respostas de erro seguem o formato `{"detail": "mensagem"}` (para 422 de validação de formato, `detail` é uma lista gerada pelo FastAPI).

| Status | Quando |
|---|---|
| 401 | `X-Employee-Id` ausente ou de funcionário inexistente |
| 403 | O funcionário não pertence à hierarquia do líder |
| 409 | O líder já avaliou esse funcionário na semana corrente |
| 422 | Nota fora de 1–4, pergunta faltando, repetida ou inexistente |

## Endpoints

### GET /employees

```json
[
  { "id": 1, "name": "Alice Hartman", "email": "alice.hartman@company.com", "position_name": "CEO" }
]
```

### GET /me 🔑

```json
{ "id": 2, "name": "Bob Sinclair", "email": "bob.sinclair@company.com", "position_name": "CTO" }
```

### GET /questions

```json
[
  { "id": 1, "title": "Entrega de Resultados", "weight": 25 },
  { "id": 2, "title": "Execução e Qualidade do Trabalho", "weight": 20 }
]
```

### GET /team 🔑

Ordenado por profundidade e nome. `depth = 1` indica liderado direto.

```json
[
  {
    "id": 8,
    "name": "Henry Patel",
    "email": "henry.patel@company.com",
    "position_name": "Senior Software Engineer",
    "depth": 2,
    "is_direct": false,
    "direct_leaders": "David Okafor",
    "last_evaluation": {
      "id": 3,
      "final_score": 3.25,
      "created_at": "2026-10-06T14:32:10.512Z",
      "evaluator_name": "David Okafor"
    },
    "evaluated_by_me_this_week": false
  }
]
```

### GET /team/{employee_id}/evaluations 🔑

Mais recente primeiro. Retorna 403 se `employee_id` não for subordinado do líder.

```json
[
  {
    "id": 3,
    "evaluator_id": 4,
    "evaluator_name": "David Okafor",
    "evaluated_id": 8,
    "final_score": 3.25,
    "week_start": "2026-10-05",
    "created_at": "2026-10-06T14:32:10.512Z",
    "answers": [
      { "question_id": 1, "title": "Entrega de Resultados", "weight": 25, "score": 4 }
    ]
  }
]
```

### POST /evaluations 🔑

Requisição (todas as perguntas são obrigatórias):

```json
{
  "evaluated_id": 8,
  "answers": [
    { "question_id": 1, "score": 4 },
    { "question_id": 2, "score": 3 },
    { "question_id": 3, "score": 3 },
    { "question_id": 4, "score": 3 },
    { "question_id": 5, "score": 3 },
    { "question_id": 6, "score": 3 }
  ]
}
```

Resposta `201 Created`: mesmo formato de um item do histórico.

Exemplo com cURL:

```bash
curl -X POST http://localhost:8080/api/evaluations \
  -H "Content-Type: application/json" \
  -H "X-Employee-Id: 2" \
  -d '{"evaluated_id":8,"answers":[{"question_id":1,"score":4},{"question_id":2,"score":3},{"question_id":3,"score":3},{"question_id":4,"score":3},{"question_id":5,"score":3},{"question_id":6,"score":3}]}'
```

Nota final do exemplo: (4×25 + 3×20 + 3×20 + 3×15 + 3×10 + 3×10) ÷ 100 = **3,25**.

## Criado por:
### Anne Francielly Siqueira | anne.epde05@gmail.com