import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Evaluation, TeamMember } from "../api/types";
import { Avatar } from "../components/Avatar";
import { Card, CardHeader } from "../components/Card";
import {
  EmptyState,
  Notice,
  SkeletonRows,
  errorText,
} from "../components/Feedback";
import { Icon } from "../components/Icon";
import { MetaChip, PageHeader } from "../components/PageHeader";
import { ScoreBadge } from "../components/ScoreBadge";
import { ScoreMeter } from "../components/ScoreMeter";
import { ScoreTrend } from "../components/ScoreTrend";
import { StatusPill } from "../components/StatusPill";
import { useLeaderId } from "../session/SessionContext";
import {
  formatDateTime,
  formatPlainDate,
  formatRelative,
  formatScore,
  formatSignedScore,
} from "../utils/format";

// ---------------------------------------------------------------------------
// Uma avaliação na linha do tempo (expansível)
// ---------------------------------------------------------------------------
function EvaluationItem({
  evaluation,
  isLatest,
}: {
  evaluation: Evaluation;
  isLatest: boolean;
}) {
  const totalPoints = evaluation.answers.reduce(
    (sum, a) => sum + a.score * a.weight,
    0
  );
  const weightSum = evaluation.answers.reduce((sum, a) => sum + a.weight, 0);

  return (
    <li
      className={`timeline__item${isLatest ? " timeline__item--latest" : ""}`}
    >
      <span className="timeline__dot" aria-hidden="true" />
      <details className="evaluation" open={isLatest}>
        <summary className="evaluation__summary">
          <ScoreBadge value={evaluation.final_score} />
          <div className="evaluation__heading">
            <p className="evaluation__title">
              Semana de {formatPlainDate(evaluation.week_start)}
              {isLatest && (
                <span className="tag tag--primary">Mais recente</span>
              )}
            </p>
            <p
              className="evaluation__date"
              title={formatDateTime(evaluation.created_at)}
            >
              {formatDateTime(evaluation.created_at)},{" "}
              {formatRelative(evaluation.created_at)}
            </p>
          </div>
          <div className="evaluation__author">
            <Avatar
              id={evaluation.evaluator_id}
              name={evaluation.evaluator_name}
              size="sm"
            />
            <span>{evaluation.evaluator_name}</span>
          </div>
          <Icon name="chevronDown" size={18} className="evaluation__chevron" />
        </summary>

        <div className="evaluation__body">
          <div className="table-scroll table-scroll--bordered">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Critério</th>
                  <th scope="col" className="num">
                    Peso
                  </th>
                  <th scope="col">Nota</th>
                  <th scope="col" className="num">
                    Pontos
                  </th>
                </tr>
              </thead>
              <tbody>
                {evaluation.answers.map((answer) => (
                  <tr key={answer.question_id}>
                    <th scope="row">{answer.title}</th>
                    <td className="num">{answer.weight}</td>
                    <td>
                      <span className="answer-score">
                        <ScoreMeter
                          value={answer.score}
                          label={`Nota ${answer.score} de 4`}
                        />
                        <span className="strong">{answer.score}</span>
                      </span>
                    </td>
                    <td className="num">{answer.score * answer.weight}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={3}>
                    Nota final{" "}
                    <span className="muted small">
                      ({totalPoints} pontos ÷ {weightSum} de peso total)
                    </span>
                  </th>
                  <td className="num">{formatScore(evaluation.final_score)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </details>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Coluna lateral: nota atual, variação e evolução
// ---------------------------------------------------------------------------
function HistoryAside({ evaluations }: { evaluations: Evaluation[] }) {
  const [latest, previous] = evaluations;
  const delta = previous ? latest.final_score - previous.final_score : null;
  const direction =
    delta === null || delta === 0 ? "flat" : delta > 0 ? "up" : "down";
  const chronological = [...evaluations].reverse().map((e) => ({
    id: e.id,
    value: e.final_score,
    label: formatPlainDate(e.week_start),
  }));
  const average =
    evaluations.reduce((sum, e) => sum + e.final_score, 0) / evaluations.length;

  return (
    <div className="aside-stack">
      <Card as="aside" label="Resumo do histórico">
        <CardHeader title="Resumo" />
        <div className="card__section">
          <div className="final-score">
            <p className="final-score__label">Nota mais recente</p>
            <div className="final-score__value">
              <ScoreBadge value={latest.final_score} size="lg" />
              <ScoreMeter value={latest.final_score} />
            </div>
            {delta !== null && (
              <span className={`delta delta--${direction}`}>
                <Icon
                  name={
                    direction === "up"
                      ? "arrowUp"
                      : direction === "down"
                      ? "arrowDown"
                      : "minus"
                  }
                  size={14}
                />
                {formatSignedScore(delta)} em relação à anterior
              </span>
            )}
          </div>
        </div>
        <dl className="card__section stats-list">
          <div>
            <dt>Avaliações visíveis</dt>
            <dd>{evaluations.length}</dd>
          </div>
          <div>
            <dt>Média do período</dt>
            <dd>{formatScore(average)}</dd>
          </div>
          <div>
            <dt>Primeira avaliação</dt>
            <dd>
              {formatPlainDate(evaluations[evaluations.length - 1].week_start)}
            </dd>
          </div>
        </dl>
      </Card>

      {chronological.length > 1 && (
        <Card label="Evolução da nota">
          <CardHeader
            title="Evolução"
            description="Nota final por semana avaliada"
          />
          <div className="card__section">
            <ScoreTrend points={chronological} />
          </div>
        </Card>
      )}

      <div className="callout">
        <Icon name="info" size={16} />
        <p>
          Você vê as avaliações feitas por você e pelos líderes abaixo de você
          na hierarquia.
        </p>
      </div>
    </div>
  );
}

function HistoryHeader({
  member,
  employeeId,
}: {
  member: TeamMember | undefined;
  employeeId: number;
}) {
  return (
    <PageHeader
      breadcrumb={[
        { label: "Equipe", to: "/" },
        { label: member?.name ?? `Funcionário ${employeeId}` },
      ]}
      leading={member && <Avatar id={member.id} name={member.name} size="lg" />}
      title={member?.name ?? "Histórico"}
      subtitle="Histórico de avaliações"
      meta={
        member && (
          <>
            <MetaChip>{member.position_name}</MetaChip>
            <MetaChip>ID {member.id}</MetaChip>
            <MetaChip>{member.email}</MetaChip>
            <MetaChip>
              {member.is_direct
                ? "Liderado direto"
                : `Indireto, reporta a ${member.direct_leaders ?? "—"}`}
            </MetaChip>
          </>
        )
      }
      actions={
        member &&
        (member.evaluated_by_me_this_week ? (
          <StatusPill tone="done">Avaliado por você nesta semana</StatusPill>
        ) : (
          <Link
            className="button button--on-dark-primary"
            to={`/team/${member.id}/evaluate`}
          >
            Avaliar agora
          </Link>
        ))
      }
    />
  );
}

export function HistoryPage() {
  const leaderId = useLeaderId();
  const employeeId = Number(useParams().employeeId);

  const team = useQuery({
    queryKey: ["team", leaderId],
    queryFn: () => api.team(leaderId),
  });
  const history = useQuery({
    queryKey: ["history", leaderId, employeeId],
    queryFn: () => api.history(leaderId, employeeId),
  });

  const member = team.data?.find((m) => m.id === employeeId);

  return (
    <>
      <HistoryHeader member={member} employeeId={employeeId} />

      <div className="container page-body">
        {history.isPending && <SkeletonRows rows={3} />}
        {history.isError && (
          <Notice tone="error" title="Não foi possível carregar o histórico.">
            {errorText(history.error)}
          </Notice>
        )}

        {history.isSuccess && history.data.length === 0 && (
          <Card>
            <EmptyState
              icon="history"
              title="Nenhuma avaliação visível ainda"
              action={
                member && !member.evaluated_by_me_this_week ? (
                  <Link className="button" to={`/team/${member.id}/evaluate`}>
                    Fazer a primeira avaliação
                  </Link>
                ) : undefined
              }
            >
              Avaliações feitas por você ou por líderes abaixo de você aparecem
              aqui.
            </EmptyState>
          </Card>
        )}

        {history.isSuccess && history.data.length > 0 && (
          <div className="split">
            <Card label="Linha do tempo">
              <CardHeader
                title="Linha do tempo"
                description="Avaliações visíveis para você, da mais recente para a mais antiga."
              />
              <div className="card__section">
                <ol className="timeline">
                  {history.data.map((evaluation, index) => (
                    <EvaluationItem
                      key={evaluation.id}
                      evaluation={evaluation}
                      isLatest={index === 0}
                    />
                  ))}
                </ol>
              </div>
            </Card>
            <HistoryAside evaluations={history.data} />
          </div>
        )}
      </div>
    </>
  );
}
