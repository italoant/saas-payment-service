/**
 * Model de domínio da Wallet.
 *
 * Representa a carteira única de gestão. Este model é puro (sem decorators de
 * ORM) — a entidade TypeORM correspondente vive na camada de infraestrutura.
 * O `balance` é armazenado em centavos (inteiro) para evitar imprecisão de
 * ponto flutuante.
 */
export class WalletModel {
  walletId: number;
  /** Saldo atual em centavos. */
  balance: number;
  /** Moeda ISO 4217 (ex.: BRL, USD). */
  currency: string;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(partial: Partial<WalletModel>) {
    Object.assign(this, partial);
  }
}
