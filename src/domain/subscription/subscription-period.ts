/**
 * Regras de negócio puras sobre o período de uma assinatura.
 *
 * Sem dependência de banco nem de framework — fáceis de testar e reutilizar
 * pelos use-cases. Espelham a lógica de vencimento do front de gestão, mas
 * aqui a fonte da verdade é o pagamento confirmado pelo gateway.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Retorna uma nova data somando `days` a `from` (imutável). */
export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * DAY_MS);
}

/**
 * Calcula o novo vencimento ao confirmar um pagamento.
 *
 * - Primeira confirmação (sem período vigente): conta a partir de `paidAt`.
 * - Renovação em dia (período ainda no futuro): estende a partir do
 *   vencimento atual, preservando a data-base (não perde dias pagos).
 * - Renovação atrasada (período já vencido): conta a partir de `paidAt`,
 *   pois o ciclo recomeça no pagamento.
 */
export function nextPeriodEnd(
  currentPeriodEnd: Date | null,
  intervalDays: number,
  paidAt: Date = new Date(),
): Date {
  if (currentPeriodEnd && currentPeriodEnd.getTime() > paidAt.getTime()) {
    return addDays(currentPeriodEnd, intervalDays);
  }
  return addDays(paidAt, intervalDays);
}

/** Indica se o período está vencido na data de referência. */
export function isOverdue(
  currentPeriodEnd: Date | null,
  ref: Date = new Date(),
): boolean {
  if (currentPeriodEnd === null) return true;
  return currentPeriodEnd.getTime() < ref.getTime();
}
