import { describe, expect, it } from 'vitest';
import { pendingOccurrences } from '@/lib/recurrence';
import { utcDate } from '@/lib/date';

describe('pendingOccurrences', () => {
  it('gera uma ocorrência por mês até hoje', () => {
    const { dates, newNextRunAt } = pendingOccurrences({
      nextRunAt: utcDate(2026, 1, 5),
      frequency: 'MONTHLY',
      until: utcDate(2026, 3, 20),
    });
    expect(dates.map((d) => d.toISOString().slice(0, 10))).toEqual([
      '2026-01-05',
      '2026-02-05',
      '2026-03-05',
    ]);
    expect(newNextRunAt.toISOString().slice(0, 10)).toBe('2026-04-05');
  });

  it('não gera nada quando a próxima data ainda está no futuro', () => {
    const { dates } = pendingOccurrences({
      nextRunAt: utcDate(2026, 6, 1),
      frequency: 'MONTHLY',
      until: utcDate(2026, 3, 20),
    });
    expect(dates).toEqual([]);
  });

  it('respeita a data de término', () => {
    const { dates } = pendingOccurrences({
      nextRunAt: utcDate(2026, 1, 10),
      frequency: 'MONTHLY',
      endsAt: utcDate(2026, 2, 15),
      until: utcDate(2026, 5, 1),
    });
    expect(dates).toHaveLength(2);
  });

  it('limita ocorrências de recorrência antiga esquecida', () => {
    const { dates } = pendingOccurrences({
      nextRunAt: utcDate(2000, 1, 1),
      frequency: 'WEEKLY',
      until: utcDate(2026, 1, 1),
    });
    expect(dates.length).toBeLessThanOrEqual(60);
  });

  it('trata frequência semanal e anual', () => {
    const semanal = pendingOccurrences({
      nextRunAt: utcDate(2026, 1, 1),
      frequency: 'WEEKLY',
      until: utcDate(2026, 1, 29),
    });
    expect(semanal.dates).toHaveLength(5);

    const anual = pendingOccurrences({
      nextRunAt: utcDate(2024, 3, 1),
      frequency: 'YEARLY',
      until: utcDate(2026, 6, 1),
    });
    expect(anual.dates).toHaveLength(3);
  });
});
