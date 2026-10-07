import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// Identificação do líder (sem login): o id escolhido fica no localStorage,
// sobrevive a recarregamentos e é enviado à API no cabeçalho X-Employee-Id.
const STORAGE_KEY = "avaliacao.leaderId";

function parseId(value: string | null): number | null {
  if (value === null) return null;
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function readStoredId(): number | null {
  try {
    return parseId(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null; // storage bloqueado (modo privado restrito, por exemplo)
  }
}

function writeStoredId(id: number | null): void {
  try {
    if (id === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, String(id));
  } catch {
    // sem storage, a escolha vale apenas enquanto a aba estiver aberta
  }
}

interface SessionValue {
  leaderId: number | null;
  selectLeader: (id: number | null) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [leaderId, setLeaderId] = useState<number | null>(readStoredId);

  const selectLeader = useCallback((id: number | null) => {
    writeStoredId(id);
    setLeaderId(id);
  }, []);

  // Mantém abas abertas em sincronia quando o líder é trocado em outra aba
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) setLeaderId(parseId(event.newValue));
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const value = useMemo(
    () => ({ leaderId, selectLeader }),
    [leaderId, selectLeader]
  );
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const context = useContext(SessionContext);
  if (context === null)
    throw new Error("useSession deve ser usado dentro de <SessionProvider>.");
  return context;
}

export function useLeaderId(): number {
  const { leaderId } = useSession();
  if (leaderId === null) throw new Error("Nenhum líder identificado.");
  return leaderId;
}
