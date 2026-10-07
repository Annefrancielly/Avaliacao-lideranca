DO $$
BEGIN
    EXECUTE format('ALTER DATABASE %I SET timezone TO %L',
                   current_database(), 'America/Sao_Paulo');
END
$$;

CREATE TABLE question (
    id            SMALLSERIAL  PRIMARY KEY,
    title         VARCHAR(120) NOT NULL UNIQUE,
    weight        SMALLINT     NOT NULL CHECK (weight > 0),
    display_order SMALLINT     NOT NULL UNIQUE
);

INSERT INTO question (title, weight, display_order) VALUES
('Entrega de Resultados',                       25, 1),
('Execução e Qualidade do Trabalho',            20, 2),
('Capacidade de Aprendizado e Desenvolvimento', 20, 3),
('Resolução de Problemas e Pensamento Crítico', 15, 4),
('Colaboração, Influência e Liderança',         10, 5),
('Visão Estratégica e Potencial de Crescimento',10, 6);

CREATE TABLE evaluation (
    id            BIGSERIAL    PRIMARY KEY,
    evaluator_id  INT          NOT NULL REFERENCES employee(id) ON DELETE RESTRICT,
    evaluated_id  INT          NOT NULL REFERENCES employee(id) ON DELETE RESTRICT,
    -- Segunda-feira da semana em que a avaliação foi registrada.
    week_start    DATE         NOT NULL DEFAULT (date_trunc('week', CURRENT_DATE))::date,
    -- Média ponderada (1.00 a 4.00), calculada pela API no momento do envio.
    final_score   NUMERIC(3,2) NOT NULL CHECK (final_score BETWEEN 1 AND 4),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT chk_evaluation_not_self
        CHECK (evaluator_id <> evaluated_id),
    CONSTRAINT uq_evaluation_pair_week
        UNIQUE (evaluator_id, evaluated_id, week_start)
);

-- Atende a busca "avaliações de um funcionário, da mais recente para a mais antiga".
CREATE INDEX idx_evaluation_evaluated_created
    ON evaluation (evaluated_id, created_at DESC);

CREATE TABLE evaluation_answer (
    evaluation_id BIGINT   NOT NULL REFERENCES evaluation(id) ON DELETE RESTRICT,
    question_id   SMALLINT NOT NULL REFERENCES question(id)   ON DELETE RESTRICT,
    score         SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 4),
    -- Cópia do peso vigente no envio: se os pesos mudarem no futuro não afetar a avaliação.
    weight        SMALLINT NOT NULL CHECK (weight > 0),
    PRIMARY KEY (evaluation_id, question_id)
);

--  Imutabilidade: após o envio, nada é alterado nem removido.
CREATE FUNCTION forbid_evaluation_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Avaliações enviadas não podem ser alteradas ou removidas (tabela %).', TG_TABLE_NAME
        USING ERRCODE = 'integrity_constraint_violation';
END
$$;

CREATE TRIGGER trg_evaluation_immutable
    BEFORE UPDATE OR DELETE ON evaluation
    FOR EACH ROW EXECUTE FUNCTION forbid_evaluation_change();

CREATE TRIGGER trg_evaluation_answer_immutable
    BEFORE UPDATE OR DELETE ON evaluation_answer
    FOR EACH ROW EXECUTE FUNCTION forbid_evaluation_change();
