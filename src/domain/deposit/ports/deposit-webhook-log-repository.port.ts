import { DepositWebhookLogModel } from '@domain/deposit/models/deposit-webhook-log.model';
import { TransactionContext } from '@domain/shared/ports/transaction-manager.port';

export interface DepositWebhookLogRepositoryPort {
  /**
   * Persiste o log do webhook recebido.
   */
  create(
    data: DepositWebhookLogModel,
    ctx?: TransactionContext,
  ): Promise<DepositWebhookLogModel>;

  /**
   * Vincula um log já gravado à transação criada, permitindo saber de qual
   * transação vieram os logs.
   */
  linkToTransaction(
    logId: number,
    walletTransactionId: number,
    ctx?: TransactionContext,
  ): Promise<void>;
}
