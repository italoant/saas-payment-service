import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SubscriptionPaymentStatusEnum } from '@domain/shared/enums/subscription-payment-status.enum';

/**
 * Entidade TypeORM de cobrança de assinatura. Tabela `subscription_payment`.
 *
 * Referencia o cliente do front por (source, external_id) — sem FK, pois o
 * cliente vive em outra base (Supabase `customers`, gerida pelo front). O
 * índice único em `gateway_charge_id` garante conciliação idempotente do
 * webhook. Não há relação com `plan`/`subscription` (removidas): valor e
 * intervalo ficam aqui.
 */
@Entity('subscription_payment')
@Index('uq_subscription_payment_gateway_charge_id', ['gatewayChargeId'], {
  unique: true,
})
@Index('idx_subscription_payment_customer', ['source', 'externalId'])
export class SubscriptionPaymentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** SaaS de origem (saasId). */
  @Column({ type: 'varchar', length: 100 })
  source: string;

  /** Id do cliente no front (customer.id). */
  @Column({ name: 'external_id', type: 'varchar', length: 255 })
  externalId: string;

  /** Valor cobrado, em centavos. */
  @Column({ type: 'bigint' })
  amount: number;

  /** Intervalo de renovação em dias (ex.: 30 = mensal). */
  @Column({ name: 'interval_days', type: 'int' })
  intervalDays: number;

  @Column({ name: 'gateway_charge_id', type: 'varchar', length: 255 })
  gatewayChargeId: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: SubscriptionPaymentStatusEnum.PENDING,
  })
  status: SubscriptionPaymentStatusEnum;

  /** Vencimento aplicado ao cliente na confirmação deste pagamento. */
  @Column({ name: 'paid_period_end', type: Date, nullable: true })
  paidPeriodEnd?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
