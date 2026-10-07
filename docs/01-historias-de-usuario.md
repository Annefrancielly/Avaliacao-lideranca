# Histórias de usuário e regras de negócio

## Ator

**Líder**: qualquer funcionário que possua ao menos um liderado (direto ou indireto) na tabela `leader_lead`. Um funcionário sem liderados pode se identificar no sistema, mas verá a equipe vazia.

## Histórias de usuário

### HU01 — Identificar-se e trocar de líder

**Como** líder, **quero** escolher quem sou em uma lista **para** avaliar a minha equipe sem um sistema de login.

Critérios de aceite:

- **Dado** que abro a aplicação pela primeira vez, **quando** nenhum líder estiver escolhido, **então** vejo uma orientação para usar o seletor "Avaliando como".
- **Dado** que escolho um líder, **quando** recarrego a página, **então** a escolha continua ativa (persistida em `localStorage`).
- **Dado** que troco o líder, **quando** a troca acontece, **então** volto para a tela da equipe e todos os dados passam a refletir o novo líder.
- **Dado** que o id salvo não existe mais no banco, **quando** a API responder 401, **então** a identificação é limpa.

### HU02 — Visualizar minha hierarquia

**Como** líder, **quero** ver todos os funcionários abaixo de mim **para** saber quem posso avaliar.

Critérios de aceite:

- A lista contém liderados diretos e indiretos em qualquer profundidade.
- Cada item mostra o identificador do avaliado (nome, cargo, e-mail e ID), se é direto ou indireto, e o líder direto dos indiretos.
- Eu não apareço na minha própria lista, nem meus pares ou superiores.

### HU03 — Avaliar um liderado

**Como** líder, **quero** responder as seis perguntas com notas de 1 a 4 **para** registrar a avaliação de um liderado.

Critérios de aceite:

- Todas as perguntas são obrigatórias; o envio só é habilitado com todas respondidas.
- Cada resposta é um inteiro entre 1 e 4.
- A nota final é a média ponderada pelos pesos definidos no case (soma dos pesos = 100), resultando em um valor de 1,00 a 4,00.
- Antes de enviar, o sistema pede confirmação informando que a avaliação não poderá ser alterada.

### HU04 — Respeitar o limite semanal

**Como** organização, **quero** que cada par líder-funcionário tenha no máximo uma avaliação por semana **para** manter a cadência e evitar avaliações repetidas.

Critérios de aceite:

- **Dado** que já avaliei um funcionário na semana corrente, **quando** tento avaliá-lo de novo, **então** a ação não está disponível na interface e a API responde 409.
- **Dado** que meu subordinado já avaliou o liderado dele nesta semana, **quando** eu avalio esse mesmo liderado, **então** a avaliação é aceita (o limite é por par, não por funcionário).
- A semana vai de segunda a domingo, no fuso `America/Sao_Paulo`.

### HU05 — Ver a avaliação mais recente

**Como** líder, **quero** ver na lista da equipe a última avaliação de cada liderado **para** acompanhar a situação de cada pessoa rapidamente.

Critérios de aceite:

- Para cada liderado é exibida a nota final, a data e o autor da avaliação mais recente **visível para mim** (ver RN06).

### HU06 — Ver o histórico e as respostas

**Como** líder, **quero** abrir o histórico de um liderado **para** ver todas as avaliações visíveis para mim, com as respostas de cada critério.

Critérios de aceite:

- As avaliações aparecem da mais recente para a mais antiga, com a mais recente destacada.
- Cada avaliação mostra autor, data, semana, nota final e a tabela de critérios com peso, nota e pontos.

### HU07 — Sigilo das avaliações

**Como** funcionário, **quero** que ninguém fora da linha hierárquica acima de mim veja minhas avaliações **para** preservar a confidencialidade.

Critérios de aceite:

- Não consigo ver a minha própria avaliação, nem a de pares ou superiores (API responde 403).
- A regra é aplicada no backend; a interface apenas reflete o que a API permite.

## Regras de negócio

| Código | Regra | Onde é garantida |
|---|---|---|
| RN01 | Notas inteiras de 1 a 4 | Schema Pydantic + `CHECK` no banco |
| RN02 | Todas as perguntas devem ser respondidas, uma única vez cada | Serviço (`EvaluationService`) |
| RN03 | Nota final = Σ(nota × peso) ÷ Σ(peso), arredondada em 2 casas | Serviço (`scoring.py`) |
| RN04 | Avaliação enviada é imutável | Ausência de endpoints de edição + trigger no banco |
| RN05 | Uma avaliação por semana por par líder-funcionário | Constraint `UNIQUE (evaluator_id, evaluated_id, week_start)` |
| RN06 | Só é possível avaliar e ver funcionários da própria hierarquia (direta ou indireta) | CTE recursiva + verificação no serviço |
| RN07 | O líder vê avaliações feitas por ele ou por líderes abaixo dele; avaliações feitas por seus superiores ou pares não lhe são exibidas | Filtro `visible_evaluator` nas consultas |
| RN08 | Ninguém avalia a si mesmo | Hierarquia + `CHECK (evaluator_id <> evaluated_id)` |

## Premissas e interpretações

1. **"Respeitando sempre a maior hierarquia"** foi interpretado como: uma avaliação só é visível para quem está **na mesma posição ou acima** de quem a escreveu, na linha hierárquica do avaliado. Exemplo: Bob (CTO) vê a avaliação que David fez de Henry; David não vê a avaliação que Bob fez de Henry. Caso o avaliador entenda a regra de outra forma, a alteração fica concentrada no CTE `visible_evaluator` (`backend/app/repositories/hierarchy_sql.py`).
2. A identificação sem login aceita qualquer funcionário cadastrado; um funcionário sem liderados simplesmente vê a equipe vazia.
3. Como `leader_lead` é N:N, um funcionário pode ter mais de um líder direto. A hierarquia considera todos os caminhos e usa a menor distância para classificar direto/indireto.
4. O peso vigente é gravado junto com cada resposta, preservando o histórico caso os pesos mudem.
