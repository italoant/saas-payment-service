/**
 * Dados de entrada para registrar um plano genérico de assinatura.
 */
export interface CreatePlanCommand {
  name: string;
  description?: string;
  /** Valor recorrente, em centavos (inteiro positivo). */
  amount: number;
  /** Moeda ISO 4217. Default BRL quando ausente. */
  currency?: string;
  /** Intervalo de renovação em dias (ex.: 30 = mensal). */
  intervalDays: number;
}
