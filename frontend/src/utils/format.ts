import type { Question } from '../api/types';

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const dayMonthFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const relativeFormatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

const MS_PER_DAY = 86_400_000;

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

export function formatPlainDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export function formatRelative(iso: string, now: Date = new Date()): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date(iso)) - startOfDay(now)) / MS_PER_DAY);
  if (Math.abs(days) < 7) return relativeFormatter.format(days, 'day');
  if (Math.abs(days) < 30) return relativeFormatter.format(Math.round(days / 7), 'week');
  return relativeFormatter.format(Math.round(days / 30), 'month');
}

export function currentWeekLabel(now: Date = new Date()): string {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const offset = (monday.getDay() + 6) % 7; // segunda = 0 & domingo = 6
  monday.setDate(monday.getDate() - offset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${dayMonthFormatter.format(monday)} a ${dayMonthFormatter.format(sunday)}`;
}

export function formatScore(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export function formatSignedScore(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${formatScore(Math.abs(value))}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
}

const AVATAR_HUES = [208, 168, 32, 280, 345, 128, 248, 12];
export function avatarHue(id: number): number {
  return AVATAR_HUES[id % AVATAR_HUES.length];
}

export type ScoreBand = 'low' | 'mid' | 'high';

export function scoreBand(value: number): ScoreBand {
  if (value >= 3.5) return 'high';
  if (value >= 2.5) return 'mid';
  return 'low';
}

export function sumWeights(questions: Question[]): number {
  return questions.reduce((sum, q) => sum + q.weight, 0);
}

export function previewWeightedScore(questions: Question[], answers: Record<number, number>): number {
  const weightSum = sumWeights(questions);
  if (weightSum === 0) return 0;
  const weighted = questions.reduce((sum, q) => sum + q.weight * (answers[q.id] ?? 0), 0);
  return Math.round((weighted / weightSum) * 100) / 100;
}
