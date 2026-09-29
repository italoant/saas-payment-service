import { WalletTransactionHistoryModel } from '@domain/wallet/models/wallet-transaction-history.model';
import { TransactionContext } from '@domain/shared/ports/transaction-manager.port';
import { TransactionStatusEnum } from '@domain/shared/enums/transaction-status.enum';

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

  /**
   * Busca uma transação pelo id da cobrança no gateway. Usada pelo webhook de
   * confirmação, que chega apenas com esse id — é assim que o serviço
   * descobre o `source` e os demais dados do depósito.
   */
  findByGatewayChargeId(
    gatewayChargeId: string,
    ctx?: TransactionContext,
  ): Promise<WalletTransactionHistoryModel | null>;

  /**
   * Atualiza uma transação existente na confirmação do pagamento: aplica o
   * novo status e o saldo resultante (previous/new balance).
   */
  updateSettlement(
    id: number,
    data: {
      status: TransactionStatusEnum;
      previousBalance: number;
      newBalance: number;
    },
    ctx?: TransactionContext,
  ): Promise<WalletTransactionHistoryModel>;
}
