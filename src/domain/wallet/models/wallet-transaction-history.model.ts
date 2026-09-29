import { TransactionStatusEnum } from '@domain/shared/enums/transaction-status.enum';

/**
 * Model de domínio de uma entrada no histórico de transações da wallet.
 *
 * Cada registro representa um crédito recebido de um SaaS de origem, guardando
 * o saldo anterior e o saldo resultante para trilha de auditoria. Valores em
 * centavos (inteiro).
 */
export class WalletTransactionHistoryModel {
  id: number;
  walletId: number;
  /** Identificador do SaaS que originou o crédito (ex.: "saas-a"). */
  source: string;
  /** Valor que entrou, em centavos. */
  amount: number;
  /** Saldo da wallet antes deste crédito, em centavos. */
  previousBalance: number;
  /** Saldo resultante (previousBalance + amount), em centavos. */
  newBalance: number;
  /** Referência da transação no sistema de origem (idempotência). */
  externalReference?: string;
  status: TransactionStatusEnum;
  createdAt?: Date;

  constructor(partial: Partial<WalletTransactionHistoryModel>) {
    Object.assign(this, partial);
  }
}
