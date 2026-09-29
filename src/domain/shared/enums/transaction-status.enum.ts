/**
 * Status de uma entrada na wallet_transaction_history.
 */
export enum TransactionStatusEnum {
  /** Registrada, saldo ainda não aplicado à wallet. */
  PENDING = 'pending',
  /** Saldo aplicado com sucesso à wallet. */
  COMPLETED = 'completed',
  /** Descartada (ex.: payload inválido, duplicada). */
  FAILED = 'failed',
}
