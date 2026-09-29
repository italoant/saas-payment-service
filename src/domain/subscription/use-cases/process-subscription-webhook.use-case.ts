import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  PLAN_REPOSITORY,
  SUBSCRIPTION_PAYMENT_REPOSITORY,
  SUBSCRIPTION_REPOSITORY,
  TRANSACTION_MANAGER,
} from '@domain/shared/ports/tokens';
import { TransactionManagerPort } from '@domain/shared/ports/transaction-manager.port';
import { PlanRepositoryPort } from '@domain/subscription/ports/plan-repository.port';
import { SubscriptionRepositoryPort } from '@domain/subscription/ports/subscription-repository.port';
import { SubscriptionPaymentRepositoryPort } from '@domain/subscription/ports/subscription-payment-repository.port';
import { SubscriptionModel } from '@domain/subscription/models/subscription.model';
import { SubscriptionStatusEnum } from '@domain/shared/enums/subscription-status.enum';
import { SubscriptionPaymentStatusEnum } from '@domain/shared/enums/subscription-payment-status.enum';
import { nextPeriodEnd } from '@domain/subscription/subscription-period';
import { ProcessSubscriptionWebhookCommand } from './process-subscription-webhook.command';

/**
 * Valores de status que o gateway pode enviar para indicar pagamento
 * confirmado (mesmos aceitos no fluxo de depósito). Quando `status` não vier,
 * assumimos confirmação (o webhook só é chamado em eventos de pagamento).
 */
const PAID_STATUSES = new Set([
  'paid',
  'approved',
  'confirmed',
  'completed',
  'success',
  'succeeded',
]);

/**
 * Confirma o pagamento de uma assinatura a partir do webhook do gateway e
 * prorroga o vencimento.
 *
 * O fluxo é:
 *   1. localiza a cobrança PENDING pelo gatewayChargeId — é assim que
 *      descobrimos qual assinatura prorrogar (o gateway só manda o id);
 *   2. se o status recebido não for de pagamento confirmado, marca a cobrança
 *      como FAILED e não prorroga;
 *   3. idempotência: se a cobrança já está PAID, não prorroga de novo;
 *   4. numa transação atômica: calcula o novo vencimento (intervalo do plano),
 *      ativa a assinatura e atualiza a cobrança para PAID.
 *
 * Depende apenas de ports — não conhece TypeORM nem o gateway concreto.
 */
@Injectable()
export class ProcessSubscriptionWebhookUseCase {
  private readonly logger = new Logger(ProcessSubscriptionWebhookUseCase.name);

  constructor(
    @Inject(TRANSACTION_MANAGER)
    private readonly transactionManager: TransactionManagerPort,
    @Inject(PLAN_REPOSITORY)
    private readonly planRepository: PlanRepositoryPort,
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: SubscriptionRepositoryPort,
    @Inject(SUBSCRIPTION_PAYMENT_REPOSITORY)
    private readonly paymentRepository: SubscriptionPaymentRepositoryPort,
  ) {}

  async execute(
    command: ProcessSubscriptionWebhookCommand,
  ): Promise<SubscriptionModel> {
    this.logger.log(
      `[SubscriptionWebhook] gatewayChargeId=${command.gatewayChargeId} status=${command.status ?? '-'}`,
    );

    // 1. Localiza a cobrança pendente pela cobrança do gateway.
    const payment = await this.paymentRepository.findByGatewayChargeId(
      command.gatewayChargeId,
    );
    if (!payment) {
      this.logger.warn(
        `[SubscriptionWebhook] Nenhuma cobrança para gatewayChargeId=${command.gatewayChargeId}`,
      );
      throw new NotFoundException(
        `No subscription payment found for gatewayChargeId=${command.gatewayChargeId}`,
      );
    }

    const subscription = await this.subscriptionRepository.findById(
      payment.subscriptionId,
    );
    if (!subscription) {
      throw new NotFoundException(
        `Subscription not found id=${payment.subscriptionId}`,
      );
    }

    // 2. Status não confirmado: marca a cobrança como FAILED e não prorroga.
    if (
      command.status &&
      !PAID_STATUSES.has(command.status.trim().toLowerCase())
    ) {
      this.logger.warn(
        `[SubscriptionWebhook] status não confirmado (${command.status}) paymentId=${payment.id}; sem prorrogação`,
      );
      await this.paymentRepository.updateSettlement(payment.id, {
        status: SubscriptionPaymentStatusEnum.FAILED,
        periodEnd: null,
      });
      return subscription;
    }

    // 3. Idempotência: cobrança já confirmada não prorroga de novo.
    if (payment.status === SubscriptionPaymentStatusEnum.PAID) {
      this.logger.warn(
        `[SubscriptionWebhook] Evento duplicado ignorado paymentId=${payment.id}`,
      );
      return subscription;
    }

    const plan = await this.planRepository.findById(subscription.planId);
    if (!plan) {
      throw new NotFoundException(
        `Plan not found id=${subscription.planId} (subscription ${subscription.id})`,
      );
    }

    const paidAt = new Date();
    const newPeriodEnd = nextPeriodEnd(
      subscription.currentPeriodEnd,
      plan.intervalDays,
      paidAt,
    );

    // 4. Transação atômica: prorroga a assinatura e confirma a cobrança.
    const settled = await this.transactionManager.runInTransaction(
      async (ctx) => {
        const updatedSubscription =
          await this.subscriptionRepository.updatePeriod(
            subscription.id,
            {
              status: SubscriptionStatusEnum.ACTIVE,
              currentPeriodEnd: newPeriodEnd,
              // Novo pagamento zera a tolerância de prorrogação manual.
              extendedDays: 0,
            },
            ctx,
          );

        await this.paymentRepository.updateSettlement(
          payment.id,
          {
            status: SubscriptionPaymentStatusEnum.PAID,
            periodEnd: newPeriodEnd,
          },
          ctx,
        );

        return updatedSubscription;
      },
    );

    this.logger.log(
      `[SubscriptionWebhook] settled subscriptionId=${settled.id} status=${settled.status} periodEnd=${settled.currentPeriodEnd?.toISOString()}`,
    );

    return settled;
  }
}
