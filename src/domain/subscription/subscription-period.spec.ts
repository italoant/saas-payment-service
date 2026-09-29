import { addDays, isOverdue, nextPeriodEnd } from './subscription-period';

describe('subscription-period', () => {
  const paidAt = new Date('2026-01-10T12:00:00Z');

  it('addDays soma dias sem mutar a data de origem', () => {
    const base = new Date('2026-01-01T00:00:00Z');
    const result = addDays(base, 30);
    expect(result.toISOString()).toBe('2026-01-31T00:00:00.000Z');
    // Original não muda.
    expect(base.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('nextPeriodEnd: primeira confirmação conta a partir do pagamento', () => {
    const result = nextPeriodEnd(null, 30, paidAt);
    expect(result.toISOString()).toBe('2026-02-09T12:00:00.000Z');
  });

  it('nextPeriodEnd: renovação em dia estende a partir do vencimento atual', () => {
    // Vencimento no futuro: não perde os dias já pagos.
    const current = new Date('2026-02-01T12:00:00Z');
    const result = nextPeriodEnd(current, 30, paidAt);
    expect(result.toISOString()).toBe('2026-03-03T12:00:00.000Z');
  });

  it('nextPeriodEnd: renovação atrasada reinicia o ciclo no pagamento', () => {
    // Vencimento no passado: conta a partir do pagamento.
    const current = new Date('2026-01-05T12:00:00Z');
    const result = nextPeriodEnd(current, 30, paidAt);
    expect(result.toISOString()).toBe('2026-02-09T12:00:00.000Z');
  });

  it('isOverdue: null é considerado vencido (sem período vigente)', () => {
    expect(isOverdue(null, paidAt)).toBe(true);
  });

  it('isOverdue: período no futuro não está vencido', () => {
    expect(isOverdue(new Date('2026-02-01T00:00:00Z'), paidAt)).toBe(false);
  });

  it('isOverdue: período no passado está vencido', () => {
    expect(isOverdue(new Date('2026-01-01T00:00:00Z'), paidAt)).toBe(true);
  });
});
