import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SubscriptionStatusEnum } from '@domain/shared/enums/subscription-status.enum';
import { PlanEntity } from './plan.entity';

/**
 * Entidade TypeORM de Assinatura. Tabela `subscription`.
 *
 * O índice único (source, external_id) garante idempotência: o mesmo cliente
 * de um SaaS não gera duas assinaturas. `current_period_end` é o vencimento —
 * prorrogado a cada pagamento confirmado.
 */
@Entity('subscription')
@Index('uq_subscription_source_external_id', ['source', 'externalId'], {
  unique: true,
})
export class SubscriptionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  source: string;

  @Column({ name: 'external_id', type: 'varchar', length: 255 })
  externalId: string;

  @Column({ name: 'plan_id', type: 'int' })
  planId: number;

  @ManyToOne(() => PlanEntity)
  @JoinColumn({ name: 'plan_id' })
  plan?: PlanEntity;

  @Column({
    type: 'varchar',
    length: 20,
    default: SubscriptionStatusEnum.PENDING,
  })
  status: SubscriptionStatusEnum;

  /** Vencimento do período vigente. Null enquanto PENDING. */
  @Column({ name: 'current_period_end', type: Date, nullable: true })
  currentPeriodEnd?: Date | null;

  /** Dias já prorrogados manualmente (limite de tolerância). */
  @Column({ name: 'extended_days', type: 'int', default: 0 })
  extendedDays: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
