/**
 * Dados de entrada para processar um webhook de depósito, já normalizados a
 * partir do payload cru recebido na API.
 */
export interface ProcessDepositWebhookCommand {
  /** SaaS de origem (vem da rota /:source). */
  source: string;
  /** Valor a creditar, em centavos. */
  amount: number;
  /** Referência da transação no sistema de origem (idempotência). */
  externalReference?: string;
  /** Payload cru completo, gravado no log. */
  rawPayload: Record<string, unknown>;
}
