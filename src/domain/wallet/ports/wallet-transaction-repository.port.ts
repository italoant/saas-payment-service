import { WalletTransactionHistoryModel } from '@domain/wallet/models/wallet-transaction-history.model';
import { TransactionContext } from '@domain/shared/ports/transaction-manager.port';

export interface WalletTransactionRepositoryPort {
  /**
   * Cria uma entrada no histórico de transações.
   */
  create(
    data: WalletTransactionHistoryModel,
    ctx?: TransactionContext,
  ): Promise<WalletTransactionHistoryModel>;

  /**
   * Busca uma transação pela referência externa (origem + referência),
   * usada para idempotência — evita creditar o mesmo evento duas vezes.
   */
  findByExternalReference(
    source: string,
    externalReference: string,
    ctx?: TransactionContext,
  ): Promise<WalletTransactionHistoryModel | null>;
}
