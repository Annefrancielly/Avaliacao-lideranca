import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { EvaluationInput, Question, TeamMember } from "../api/types";
import { Avatar } from "../components/Avatar";
import { Card, CardHeader } from "../components/Card";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Notice, SkeletonRows, errorText } from "../components/Feedback";
import { Icon } from "../components/Icon";
import { MetaChip, PageHeader } from "../components/PageHeader";
import { ScoreBadge } from "../components/ScoreBadge";
import { ScoreMeter } from "../components/ScoreMeter";
import { useToast } from "../components/Toast";
import { useLeaderId } from "../session/SessionContext";
import { formatScore, previewWeightedScore, sumWeights } from "../utils/format";

const SCALE = [1, 2, 3, 4] as const;

type Answers = Record<number, number>;

function EvaluatedHeader({ member }: { member: TeamMember }) {
  return (
    <PageHeader
      breadcrumb={[
        { label: "Equipe", to: "/" },
        { label: member.name, to: `/team/${member.id}/history` },
        { label: "Nova avaliação" },
      ]}
      leading={<Avatar id={member.id} name={member.name} size="lg" />}
      title={member.name}
      subtitle="Nova avaliação"
      meta={
        <>
          <MetaChip>{member.position_name}</MetaChip>
          <MetaChip>ID {member.id}</MetaChip>
          <MetaChip>
            {member.is_direct
              ? "Liderado direto"
              : `Indireto, reporta a ${member.direct_leaders ?? "—"}`}
          </MetaChip>
        </>
      }
      actions={
        <Link className="button button--on-dark" to="/">
          Cancelar
        </Link>
      }
    />
  );
}

interface CriterionProps {
  index: number;
  question: Question;
  weightShare: number;
  value: number | undefined;
  onChange: (value: number) => void;
}

function Criterion({
  index,
  question,
  weightShare,
  value,
  onChange,
}: CriterionProps) {
  const answered = value !== undefined;
  return (
    <fieldset className={`criterion${answered ? " criterion--answered" : ""}`}>
      <span className="criterion__index" aria-hidden="true">
        {answered ? <Icon name="check" size={16} /> : index}
      </span>

      <div className="criterion__info">
        <legend className="criterion__title">{question.title}</legend>
        <div className="criterion__weight">
          <span className="weight-chip">Peso {question.weight}</span>
          <span className="weight-bar" aria-hidden="true">
            <span style={{ width: `${weightShare}%` }} />
          </span>
          <span className="criterion__share">
            {Math.round(weightShare)}% da nota
          </span>
        </div>
      </div>

      <div className="criterion__scale">
        <div className="scale">
          {SCALE.map((option) => (
            <label key={option} className="scale__option">
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option}
                checked={value === option}
                onChange={() => onChange(option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
        <div className="scale__legend" aria-hidden="true">
          <span>Mais baixa</span>
          <span>Mais alta</span>
        </div>
      </div>
    </fieldset>
  );
}

interface SummaryPanelProps {
  questions: Question[];
  answers: Answers;
  isComplete: boolean;
  error: unknown;
}

function SummaryPanel({
  questions,
  answers,
  isComplete,
  error,
}: SummaryPanelProps) {
  const preview = previewWeightedScore(questions, answers);
  const weightSum = sumWeights(questions);
  const totalPoints = questions.reduce(
    (sum, q) => sum + (answers[q.id] ?? 0) * q.weight,
    0
  );

  return (
    <Card as="aside" className="summary-card" label="Resumo da avaliação">
      <CardHeader title="Resumo" />

      <div className="card__section">
        <div
          className={`final-score${isComplete ? "" : " final-score--empty"}`}
        >
          <p className="final-score__label">Nota final prevista</p>
          {isComplete ? (
            <div className="final-score__value">
              <ScoreBadge value={preview} size="lg" />
              <ScoreMeter value={preview} />
            </div>
          ) : (
            <p className="final-score__hint">
              Responda todos os critérios para calcular.
            </p>
          )}
        </div>
      </div>

      <div className="card__section">
        <p className="section-label">Contribuição por critério</p>
        <ul className="contribution">
          {questions.map((q) => {
            const score = answers[q.id];
            const max = q.weight * 4;
            const points = score === undefined ? 0 : score * q.weight;
            return (
              <li key={q.id} className="contribution__row">
                <div className="contribution__line">
                  <span className="contribution__name" title={q.title}>
                    {q.title}
                  </span>
                  <span className="contribution__points">
                    {score === undefined ? "—" : points}
                    <span className="contribution__max">/{max}</span>
                  </span>
                </div>
                <span className="contribution__bar" aria-hidden="true">
                  <span style={{ width: `${(points / max) * 100}%` }} />
                </span>
              </li>
            );
          })}
        </ul>
        <div className="contribution__total">
          <span>Total de pontos</span>
          <span>
            {totalPoints}{" "}
            <span className="contribution__max">de {weightSum * 4}</span>
          </span>
        </div>
      </div>

      <div className="card__section">
        <button
          type="submit"
          form="evaluation-form"
          className="button button--block button--large"
          disabled={!isComplete}
        >
          Revisar e enviar
        </button>
        <div className="callout">
          <Icon name="lock" size={16} />
          <p>
            Depois de enviada, a avaliação não pode ser alterada. Cada liderado
            pode ser avaliado por você uma vez por semana.
          </p>
        </div>
        {error !== null && (
          <Notice tone="error" title="A avaliação não foi enviada.">
            {errorText(error)}
          </Notice>
        )}
      </div>
    </Card>
  );
}

export function EvaluatePage() {
  const leaderId = useLeaderId();
  const evaluatedId = Number(useParams().employeeId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const team = useQuery({
    queryKey: ["team", leaderId],
    queryFn: () => api.team(leaderId),
  });
  const questions = useQuery({
    queryKey: ["questions"],
    queryFn: api.listQuestions,
    staleTime: Infinity,
  });
  const [answers, setAnswers] = useState<Answers>({});
  const [confirming, setConfirming] = useState(false);

  const submit = useMutation({
    mutationFn: (payload: EvaluationInput) =>
      api.createEvaluation(leaderId, payload),
    onSuccess: async (created) => {
      // Atualiza a lista do time (status da semana) e o histórico do avaliado
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["team", leaderId] }),
        queryClient.invalidateQueries({
          queryKey: ["history", leaderId, evaluatedId],
        }),
      ]);
      toast.show({
        tone: "success",
        title: "Avaliação enviada",
        body: `Nota final ${formatScore(
          created.final_score
        )}. O registro não pode mais ser alterado.`,
      });
      navigate(`/team/${evaluatedId}/history`);
    },
    onError: () => setConfirming(false),
  });

  if (team.isPending || questions.isPending) {
    return (
      <div className="container page-body page-body--plain">
        <SkeletonRows rows={6} />
      </div>
    );
  }
  if (team.isError || questions.isError) {
    return (
      <div className="container page-body page-body--plain">
        <Notice tone="error" title="Não foi possível carregar o formulário.">
          {errorText(team.error ?? questions.error)}
        </Notice>
      </div>
    );
  }

  const member = team.data.find((m) => m.id === evaluatedId);
  if (!member) {
    return (
      <div className="container page-body page-body--plain">
        <Notice
          tone="warning"
          title="Este funcionário não faz parte da sua hierarquia."
          action={
            <Link className="button button--secondary" to="/">
              Voltar para a equipe
            </Link>
          }
        />
      </div>
    );
  }

  if (member.evaluated_by_me_this_week) {
    return (
      <>
        <EvaluatedHeader member={member} />
        <div className="container page-body">
          <Card>
            <div className="card__section">
              <Notice
                tone="warning"
                title={`Você já avaliou ${member.name} nesta semana.`}
                action={
                  <Link
                    className="button button--secondary"
                    to={`/team/${member.id}/history`}
                  >
                    Ver histórico
                  </Link>
                }
              >
                Uma nova avaliação poderá ser feita a partir da próxima
                segunda-feira.
              </Notice>
            </div>
          </Card>
        </div>
      </>
    );
  }

  const questionList = questions.data;
  const weightSum = sumWeights(questionList);
  const answeredCount = questionList.filter(
    (q) => answers[q.id] !== undefined
  ).length;
  const isComplete =
    questionList.length > 0 && answeredCount === questionList.length;
  const preview = previewWeightedScore(questionList, answers);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isComplete) setConfirming(true);
  }

  function confirmSubmit() {
    submit.mutate({
      evaluated_id: evaluatedId,
      answers: questionList.map((q) => ({
        question_id: q.id,
        score: answers[q.id],
      })),
    });
  }

  return (
    <>
      <EvaluatedHeader member={member} />

      <div className="container page-body">
        <div className="split">
          <Card className="criteria-card">
            <CardHeader
              title="Critérios de avaliação"
              description="Atribua uma nota inteira de 1 a 4 a cada critério. Critérios com peso maior influenciam mais a nota final."
              actions={
                <span
                  className={`progress-chip${
                    isComplete ? " progress-chip--done" : ""
                  }`}
                >
                  {answeredCount} de {questionList.length} respondidos
                </span>
              }
            />
            <div
              className="progress progress--flush"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={questionList.length}
              aria-valuenow={answeredCount}
              aria-label="Critérios respondidos"
            >
              <span
                style={{
                  width: `${(answeredCount / questionList.length) * 100}%`,
                }}
              />
            </div>

            <form
              id="evaluation-form"
              className="criteria"
              onSubmit={handleSubmit}
              noValidate
            >
              {questionList.map((question, index) => (
                <Criterion
                  key={question.id}
                  index={index + 1}
                  question={question}
                  weightShare={(question.weight / weightSum) * 100}
                  value={answers[question.id]}
                  onChange={(value) =>
                    setAnswers((current) => ({
                      ...current,
                      [question.id]: value,
                    }))
                  }
                />
              ))}
            </form>
          </Card>

          <SummaryPanel
            questions={questionList}
            answers={answers}
            isComplete={isComplete}
            error={submit.isError ? submit.error : null}
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title={`Enviar avaliação de ${member.name}?`}
        description="Confira as notas. Depois do envio, a avaliação fica registrada e não pode ser alterada."
        confirmLabel="Enviar avaliação"
        cancelLabel="Revisar respostas"
        busy={submit.isPending}
        onConfirm={confirmSubmit}
        onCancel={() => setConfirming(false)}
      >
        <div className="table-scroll table-scroll--bordered">
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th scope="col">Critério</th>
                <th scope="col" className="num">
                  Peso
                </th>
                <th scope="col" className="num">
                  Nota
                </th>
              </tr>
            </thead>
            <tbody>
              {questionList.map((q) => (
                <tr key={q.id}>
                  <th scope="row">{q.title}</th>
                  <td className="num">{q.weight}</td>
                  <td className="num strong">{answers[q.id]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="dialog__score">
          <span>Nota final</span>
          <span className="dialog__score-value">
            <ScoreMeter value={preview} />
            <ScoreBadge value={preview} size="lg" />
          </span>
        </div>
      </ConfirmDialog>
    </>
  );
}
