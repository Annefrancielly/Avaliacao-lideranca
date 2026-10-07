import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { ApiError, api } from './api/client';
import { EmptyState } from './components/Feedback';
import { Icon } from './components/Icon';
import { LeaderSwitcher } from './components/LeaderSwitcher';
import { EvaluatePage } from './pages/EvaluatePage';
import { HistoryPage } from './pages/HistoryPage';
import { TeamPage } from './pages/TeamPage';
import { useSession } from './session/SessionContext';
import { currentWeekLabel } from './utils/format';

function useScrolled(threshold = 4): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

export default function App() {
  const { leaderId, selectLeader } = useSession();
  const scrolled = useScrolled();

  // Valida o id salvo no localStorage
  const me = useQuery({
    queryKey: ['me', leaderId],
    queryFn: () => api.me(leaderId as number),
    enabled: leaderId !== null,
  });

  useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 401) selectLeader(null);
  }, [me.error, selectLeader]);

  return (
    <div className="app">
      <header className={`topbar${scrolled ? ' topbar--scrolled' : ''}`}>
        <div className="container topbar__inner">
          <Link to="/" className="brand">
            <span className="brand__mark" aria-hidden="true">
              <Icon name="clipboard" size={18} />
            </span>
            <span className="brand__name">Avaliação de liderados</span>
          </Link>
          <div className="topbar__right">
            <span className="week-chip">
              <Icon name="clock" size={14} />
              Semana {currentWeekLabel()}
            </span>
            <LeaderSwitcher />
          </div>
        </div>
      </header>

      <main>
        {leaderId === null ? (
          <div className="container welcome">
            <EmptyState icon="users" title="Quem está avaliando?">
              Escolha seu nome em “Avaliando como”, no topo da página. A escolha fica salva neste navegador e
              pode ser trocada a qualquer momento.
            </EmptyState>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<TeamPage />} />
            <Route path="/team/:employeeId/evaluate" element={<EvaluatePage />} />
            <Route path="/team/:employeeId/history" element={<HistoryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
    </div>
  );
}
