import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WalletTransactionHistoryEntity } from './wallet-transaction-history.entity';

/**
 * Entidade TypeORM do log de webhook. Tabela `deposit_webhook_log`.
 *
 * Guarda o payload cru e o vincula à transação gerada, permitindo rastrear de
 * qual transação vieram os logs. O payload usa `simple-json`, portável entre
 * bancos (serializa como texto); troque para `json`/`jsonb` na migration se o
 * banco escolhido tiver suporte nativo e você quiser consultar por campo.
 */
@Entity('deposit_webhook_log')
export class DepositWebhookLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  source: string;

  @Column({ type: 'simple-json' })
  payload: Record<string, unknown>;

  @Index('idx_deposit_log_tx')
  @Column({ name: 'wallet_transaction_id', type: 'int', nullable: true })
  walletTransactionId?: number;

  @ManyToOne(() => WalletTransactionHistoryEntity, { nullable: true })
  @JoinColumn({ name: 'wallet_transaction_id' })
  walletTransaction?: WalletTransactionHistoryEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
