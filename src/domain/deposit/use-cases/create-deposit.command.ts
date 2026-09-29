/**
 * Dados de entrada para criar um depósito e gerar a cobrança (QR Code) no
 * gateway, já normalizados a partir do request da API.
 */
export interface CreateDepositCommand {
  /** SaaS de origem do depósito. */
  source: string;
  /** Valor a depositar, em centavos (inteiro positivo). */
  amount: number;
  /**
   * Referência da transação no sistema de origem. Usada para idempotência:
   * o mesmo depósito não gera duas cobranças.
   */
  externalReference?: string;
}
