import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SubscriptionPaymentStatusEnum } from '@domain/shared/enums/subscription-payment-status.enum';
import { SubscriptionEntity } from './subscription.entity';

/**
 * Entidade TypeORM de cobrança de assinatura. Tabela `subscription_payment`.
 *
 * O índice único em `gateway_charge_id` garante que o mesmo evento do gateway
 * não seja conciliado duas vezes — é por esse id que o webhook localiza a
 * cobrança e prorroga a assinatura correspondente.
 */
@Entity('subscription_payment')
@Index('uq_subscription_payment_gateway_charge_id', ['gatewayChargeId'], {
  unique: true,
})
export class SubscriptionPaymentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'subscription_id', type: 'int' })
  subscriptionId: number;

  @ManyToOne(() => SubscriptionEntity)
  @JoinColumn({ name: 'subscription_id' })
  subscription?: SubscriptionEntity;

  @Column({ type: 'varchar', length: 100 })
  source: string;

  /** Valor cobrado, em centavos. */
  @Column({ type: 'bigint' })
  amount: number;

  @Column({ name: 'gateway_charge_id', type: 'varchar', length: 255 })
  gatewayChargeId: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: SubscriptionPaymentStatusEnum.PENDING,
  })
  status: SubscriptionPaymentStatusEnum;

  /** Fim do período que este pagamento cobriu (preenchido na confirmação). */
  @Column({ name: 'period_end', type: Date, nullable: true })
  periodEnd?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
