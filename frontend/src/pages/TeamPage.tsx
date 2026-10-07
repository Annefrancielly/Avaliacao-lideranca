import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { TeamMember } from "../api/types";
import { Avatar } from "../components/Avatar";
import { Card, CardHeader } from "../components/Card";
import {
  EmptyState,
  Notice,
  SkeletonRows,
  errorText,
} from "../components/Feedback";
import { Icon, type IconName } from "../components/Icon";
import { MetaChip, PageHeader } from "../components/PageHeader";
import { ScoreBadge } from "../components/ScoreBadge";
import { ScoreMeter } from "../components/ScoreMeter";
import { StatusPill } from "../components/StatusPill";
import { useLeaderId } from "../session/SessionContext";
import { formatDateTime, formatRelative } from "../utils/format";

type Filter = "all" | "direct" | "indirect" | "pending";

const FILTERS: {
  value: Filter;
  label: string;
  match: (m: TeamMember) => boolean;
}[] = [
  { value: "all", label: "Todos", match: () => true },
  {
    value: "pending",
    label: "Pendentes",
    match: (m) => !m.evaluated_by_me_this_week,
  },
  { value: "direct", label: "Diretos", match: (m) => m.is_direct },
  { value: "indirect", label: "Indiretos", match: (m) => !m.is_direct },
];

function levelTitle(depth: number): string {
  return depth === 1 ? "Liderados diretos" : `${depth}º nível`;
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

interface StatProps {
  icon: IconName;
  tone: "blue" | "green" | "amber" | "violet";
  label: string;
  children: ReactNode;
  footer?: ReactNode;
}

function Stat({ icon, tone, label, children, footer }: StatProps) {
  return (
    <div className="card stat">
      <div className="stat__top">
        <p className="stat__label">{label}</p>
        <span className={`stat__icon stat__icon--${tone}`}>
          <Icon name={icon} size={18} />
        </span>
      </div>
      <div className="stat__value">{children}</div>
      {footer && <div className="stat__footer">{footer}</div>}
    </div>
  );
}

function TeamStats({ members }: { members: TeamMember[] }) {
  const direct = members.filter((m) => m.is_direct).length;
  const done = members.filter((m) => m.evaluated_by_me_this_week).length;
  const scores = members.flatMap((m) =>
    m.last_evaluation ? [m.last_evaluation.final_score] : []
  );
  const average =
    scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : null;
  const progress =
    members.length > 0 ? Math.round((done / members.length) * 100) : 0;

  return (
    <div className="stats">
      <Stat
        icon="users"
        tone="blue"
        label="Pessoas na hierarquia"
        footer={`${direct} diretas e ${members.length - direct} indiretas`}
      >
        {members.length}
      </Stat>

      <Stat
        icon="checkCircle"
        tone="green"
        label="Avaliadas nesta semana"
        footer={
          <div
            className="progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={members.length}
            aria-valuenow={done}
            aria-label="Avaliações feitas por você nesta semana"
          >
            <span style={{ width: `${progress}%` }} />
          </div>
        }
      >
        {done}
        <span className="stat__suffix">de {members.length}</span>
      </Stat>

      <Stat
        icon="clock"
        tone="amber"
        label="Pendentes na semana"
        footer="Disponíveis para avaliar agora"
      >
        {members.length - done}
      </Stat>

      <Stat
        icon="chart"
        tone="violet"
        label="Média das últimas notas"
        footer={
          average !== null
            ? `${scores.length} de ${members.length} com avaliação visível`
            : "Nenhuma avaliação visível"
        }
      >
        {average !== null ? (
          <span className="stat__score">
            <ScoreBadge value={average} size="lg" />
            <ScoreMeter value={average} />
          </span>
        ) : (
          <span className="stat__empty">Sem dados</span>
        )}
      </Stat>
    </div>
  );
}

function MemberRow({ member }: { member: TeamMember }) {
  const last = member.last_evaluation;
  return (
    <div className="team-row" role="row">
      <div className="team-row__person" role="cell">
        <Avatar id={member.id} name={member.name} />
        <div className="team-row__text">
          <p className="team-row__name">
            <Link to={`/team/${member.id}/history`}>{member.name}</Link>
            <span className="id-tag">#{member.id}</span>
          </p>
          <p className="team-row__sub">{member.position_name}</p>
          <p className="team-row__sub team-row__email">{member.email}</p>
        </div>
      </div>

      <div className="team-row__reports" role="cell">
        <span className="cell-label">Reporta a</span>
        {member.is_direct ? "Você" : member.direct_leaders ?? "—"}
      </div>

      <div className="team-row__last" role="cell">
        <span className="cell-label">Última avaliação</span>
        {last ? (
          <>
            <span className="team-row__score">
              <ScoreBadge value={last.final_score} />
              <ScoreMeter value={last.final_score} />
            </span>
            <span
              className="team-row__sub"
              title={formatDateTime(last.created_at)}
            >
              {formatRelative(last.created_at)}, por {last.evaluator_name}
            </span>
          </>
        ) : (
          <span className="team-row__sub">Sem avaliação visível</span>
        )}
      </div>

      <div className="team-row__status" role="cell">
        {member.evaluated_by_me_this_week ? (
          <StatusPill tone="done">Avaliado por você</StatusPill>
        ) : (
          <StatusPill tone="pending">Pendente</StatusPill>
        )}
      </div>

      <div className="team-row__actions" role="cell">
        {!member.evaluated_by_me_this_week && (
          <Link
            className="button button--small"
            to={`/team/${member.id}/evaluate`}
          >
            Avaliar
          </Link>
        )}
        <Link
          className="button button--small button--secondary"
          to={`/team/${member.id}/history`}
        >
          <Icon name="history" size={16} />
          Histórico
        </Link>
      </div>
    </div>
  );
}

export function TeamPage() {
  const leaderId = useLeaderId();
  const me = useQuery({
    queryKey: ["me", leaderId],
    queryFn: () => api.me(leaderId),
  });
  const team = useQuery({
    queryKey: ["team", leaderId],
    queryFn: () => api.team(leaderId),
  });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "/" && !isTypingTarget(event.target)) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const members = useMemo(() => team.data ?? [], [team.data]);

  const groups = useMemo(() => {
    const term = normalize(search.trim());
    const matchFilter =
      FILTERS.find((f) => f.value === filter)?.match ?? (() => true);
    const visible = members.filter(
      (m) =>
        matchFilter(m) &&
        (term === "" ||
          normalize(`${m.name} ${m.position_name} ${m.email}`).includes(term))
    );
    const byDepth = new Map<number, TeamMember[]>();
    for (const member of visible) {
      byDepth.set(member.depth, [...(byDepth.get(member.depth) ?? []), member]);
    }
    return [...byDepth.entries()].sort(([a], [b]) => a - b);
  }, [members, search, filter]);

  const visibleCount = groups.reduce((sum, [, list]) => sum + list.length, 0);

  function clearFilters() {
    setSearch("");
    setFilter("all");
  }

  return (
    <>
      <PageHeader
        leading={
          me.data && <Avatar id={me.data.id} name={me.data.name} size="lg" />
        }
        title={me.data ? me.data.name : "Sua equipe"}
        subtitle="Acompanhe e avalie os funcionários da sua hierarquia."
        meta={
          me.data && (
            <>
              <MetaChip>{me.data.position_name}</MetaChip>
              <MetaChip>{me.data.email}</MetaChip>
            </>
          )
        }
      />

      <div className="container page-body">
        {team.isPending && <SkeletonRows />}
        {team.isError && (
          <Notice tone="error" title="Não foi possível carregar a equipe.">
            {errorText(team.error)}
          </Notice>
        )}

        {team.isSuccess && members.length === 0 && (
          <Card>
            <EmptyState title="Nenhum liderado na sua hierarquia">
              Escolha outro líder em “Avaliando como” para avaliar uma equipe.
            </EmptyState>
          </Card>
        )}

        {team.isSuccess && members.length > 0 && (
          <>
            <TeamStats members={members} />

            <Card className="team-card">
              <CardHeader
                title="Sua equipe"
                description="Liderados diretos e indiretos, agrupados pelo nível na hierarquia."
                actions={
                  <label className="search">
                    <span className="visually-hidden">Buscar na equipe</span>
                    <Icon name="search" size={18} className="search__icon" />
                    <input
                      ref={searchRef}
                      type="search"
                      placeholder="Buscar nome, cargo ou e-mail"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") setSearch("");
                      }}
                    />
                    <kbd className="search__kbd" aria-hidden="true">
                      /
                    </kbd>
                  </label>
                }
              >
                <div className="tabs" role="group" aria-label="Filtrar equipe">
                  {FILTERS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className="tabs__tab"
                      aria-pressed={filter === option.value}
                      onClick={() => setFilter(option.value)}
                    >
                      {option.label}
                      <span className="tabs__count">
                        {members.filter(option.match).length}
                      </span>
                    </button>
                  ))}
                </div>
              </CardHeader>

              {visibleCount === 0 ? (
                <EmptyState
                  icon="search"
                  title="Ninguém corresponde à busca"
                  action={
                    <button
                      type="button"
                      className="button button--secondary"
                      onClick={clearFilters}
                    >
                      Limpar filtros
                    </button>
                  }
                >
                  Ajuste o termo pesquisado ou o filtro selecionado.
                </EmptyState>
              ) : (
                <div className="team-table" role="table" aria-label="Liderados">
                  <div className="team-table__head" role="row">
                    <span role="columnheader">Pessoa</span>
                    <span role="columnheader">Reporta a</span>
                    <span role="columnheader">Última avaliação</span>
                    <span role="columnheader">Situação</span>
                    <span role="columnheader" className="visually-hidden">
                      Ações
                    </span>
                  </div>
                  {groups.map(([depth, list]) => (
                    <Fragment key={depth}>
                      <div className="team-table__group" role="row">
                        <span role="cell">
                          {levelTitle(depth)}
                          <span className="team-table__group-count">
                            {list.length}
                          </span>
                        </span>
                      </div>
                      {list.map((member) => (
                        <MemberRow key={member.id} member={member} />
                      ))}
                    </Fragment>
                  ))}
                </div>
              )}

              <footer className="card__footer">
                Mostrando {visibleCount} de {members.length} pessoas
                {(search !== "" || filter !== "all") && (
                  <button
                    type="button"
                    className="link-button"
                    onClick={clearFilters}
                  >
                    Limpar filtros
                  </button>
                )}
              </footer>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
