import type { Employee, Evaluation, EvaluationInput, Question, TeamMember } from './types';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  leaderId?: number;
  method?: 'GET' | 'POST';
  body?: unknown;
}

// A API responde erros como { detail: string } (regras de negócio)
// ou { detail: [{ msg: string }, ...] } (validação do Pydantic).
function extractMessage(body: unknown, fallback: string): string {
  if (typeof body !== 'object' || body === null || !('detail' in body)) return fallback;
  const detail = (body as { detail: unknown }).detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => (typeof item === 'object' && item !== null && 'msg' in item ? String(item.msg) : String(item)))
      .join('; ');
  }
  return fallback;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  // Identificação do líder: enviada em toda requisição que depende dele
  if (options.leaderId !== undefined) headers['X-Employee-Id'] = String(options.leaderId);
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    let message = `Erro ${response.status} ao comunicar com o servidor.`;
    try {
      message = extractMessage(await response.json(), message);
    } catch {
      // corpo vazio ou não-JSON: mantém a mensagem padrão
    }
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as T;
}

export const api = {
  listEmployees: () => request<Employee[]>('/employees'),
  listQuestions: () => request<Question[]>('/questions'),
  me: (leaderId: number) => request<Employee>('/me', { leaderId }),
  team: (leaderId: number) => request<TeamMember[]>('/team', { leaderId }),
  history: (leaderId: number, employeeId: number) =>
    request<Evaluation[]>(`/team/${employeeId}/evaluations`, { leaderId }),
  createEvaluation: (leaderId: number, payload: EvaluationInput) =>
    request<Evaluation>('/evaluations', { leaderId, method: 'POST', body: payload }),
};
