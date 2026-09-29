import { WalletModel } from '@domain/wallet/models/wallet.model';
import { TransactionContext } from '@domain/shared/ports/transaction-manager.port';

export interface WalletRepositoryPort {
  /**
   * Retorna a wallet de gestão. Como o serviço opera com uma única wallet,
   * este método a garante (cria na primeira chamada se não existir).
   *
   * @param defaultCurrency moeda usada caso a wallet ainda não exista.
   * @param ctx contexto transacional opcional.
   */
  getOrCreate(
    defaultCurrency: string,
    ctx?: TransactionContext,
  ): Promise<WalletModel>;

  /**
   * Atualiza o saldo da wallet. Deve ser chamado dentro de uma transação
   * junto com a criação do histórico para manter consistência.
   */
  updateBalance(
    walletId: number,
    newBalance: number,
    ctx?: TransactionContext,
  ): Promise<void>;
}
