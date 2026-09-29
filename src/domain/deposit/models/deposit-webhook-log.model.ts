/**
 * Model de domínio do log de webhook de depósito.
 *
 * Guarda o payload cru recebido de um SaaS e o vincula à transação gerada
 * (walletTransactionId), permitindo rastrear de qual transação vieram os logs.
 */
export class DepositWebhookLogModel {
  id: number;
  /** SaaS que enviou o webhook. */
  source: string;
  /** Payload cru recebido (JSON). */
  payload: Record<string, unknown>;
  /**
   * Transação vinculada. Fica null quando o log é gravado antes de a
   * transação ser criada (ex.: payload rejeitado).
   */
  walletTransactionId?: number;
  createdAt?: Date;

  constructor(partial: Partial<DepositWebhookLogModel>) {
    Object.assign(this, partial);
  }
}
