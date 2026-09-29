import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TransactionStatusEnum } from '@domain/shared/enums/transaction-status.enum';
import { WalletEntity } from './wallet.entity';

/**
 * Entidade TypeORM do histórico de transações. Tabela
 * `wallet_transaction_history`.
 *
 * O índice único (source, external_reference) garante idempotência a nível de
 * banco: o mesmo evento de um SaaS não pode ser creditado duas vezes.
 */
@Entity('wallet_transaction_history')
@Index('uq_wallet_tx_source_ref', ['source', 'externalReference'], {
  unique: true,
})
export class WalletTransactionHistoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'wallet_id', type: 'int' })
  walletId: number;

  @ManyToOne(() => WalletEntity)
  @JoinColumn({ name: 'wallet_id' })
  wallet?: WalletEntity;

  /** SaaS de origem do crédito. */
  @Column({ type: 'varchar', length: 100 })
  source: string;

  /** Valor creditado, em centavos. */
  @Column({ type: 'bigint' })
  amount: number;

  /** Saldo anterior ao crédito, em centavos. */
  @Column({ name: 'previous_balance', type: 'bigint' })
  previousBalance: number;

  /** Saldo resultante, em centavos. */
  @Column({ name: 'new_balance', type: 'bigint' })
  newBalance: number;

  /** Referência da transação no sistema de origem. */
  @Column({
    name: 'external_reference',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  externalReference?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: TransactionStatusEnum.COMPLETED,
  })
  status: TransactionStatusEnum;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
