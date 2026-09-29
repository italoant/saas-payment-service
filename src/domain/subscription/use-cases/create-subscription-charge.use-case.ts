import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  PAYMENT_GATEWAY,
  PLAN_REPOSITORY,
  SUBSCRIPTION_PAYMENT_REPOSITORY,
  SUBSCRIPTION_REPOSITORY,
  TRANSACTION_MANAGER,
} from '@domain/shared/ports/tokens';
import { TransactionManagerPort } from '@domain/shared/ports/transaction-manager.port';
import {
  GatewayChargeResult,
  PaymentGatewayPort,
} from '@domain/deposit/ports/payment-gateway.port';
import { PlanRepositoryPort } from '@domain/subscription/ports/plan-repository.port';
import { SubscriptionRepositoryPort } from '@domain/subscription/ports/subscription-repository.port';
import { SubscriptionPaymentRepositoryPort } from '@domain/subscription/ports/subscription-payment-repository.port';
import { SubscriptionModel } from '@domain/subscription/models/subscription.model';
import { SubscriptionPaymentModel } from '@domain/subscription/models/subscription-payment.model';
import { SubscriptionStatusEnum } from '@domain/shared/enums/subscription-status.enum';
import { SubscriptionPaymentStatusEnum } from '@domain/shared/enums/subscription-payment-status.enum';
import { CreateSubscriptionChargeCommand } from './create-subscription-charge.command';

/**
 * Resultado da criação de uma cobrança de assinatura: a assinatura (criada ou
 * existente), a cobrança PENDING registrada e os dados do QR Code para pagar.
 */
export interface CreateSubscriptionChargeResult {
  subscription: SubscriptionModel;
  payment: SubscriptionPaymentModel;
  charge: GatewayChargeResult;
}

/**
 * Orquestra a criação de uma cobrança de assinatura:
 *
 *   1. valida o plano (existe e está ativo);
 *   2. garante a assinatura para (source, externalId) — cria PENDING se não
 *      existir (idempotente);
 *   3. chama o gateway para gerar a cobrança (QR Code) do valor do plano;
 *   4. registra a cobrança como PENDING (o vencimento NÃO muda aqui — a
 *      prorrogação acontece quando o gateway confirmar o pagamento via
 *      webhook);
 *   5. retorna assinatura, cobrança e QR Code.
 *
 * Depende apenas de ports — não conhece TypeORM nem o gateway concreto.
 */
@Injectable()
export class CreateSubscriptionChargeUseCase {
  private readonly logger = new Logger(CreateSubscriptionChargeUseCase.name);

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGatewayPort,
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
    command: CreateSubscriptionChargeCommand,
  ): Promise<CreateSubscriptionChargeResult> {
    this.logger.log(
      `[CreateSubscriptionCharge] source=${command.source} externalId=${command.externalId} planId=${command.planId}`,
    );

    // 1. Valida o plano.
    const plan = await this.planRepository.findById(command.planId);
    if (!plan) {
      throw new NotFoundException(`Plan not found id=${command.planId}`);
    }
    if (!plan.active) {
      throw new BadRequestException(`Plan is not active id=${command.planId}`);
    }

    // 2. Garante a assinatura (idempotente por source+externalId).
    let subscription =
      await this.subscriptionRepository.findBySourceAndExternalId(
        command.source,
        command.externalId,
      );
    if (!subscription) {
      subscription = await this.subscriptionRepository.create(
        new SubscriptionModel({
          source: command.source,
          externalId: command.externalId,
          planId: plan.id,
          status: SubscriptionStatusEnum.PENDING,
          currentPeriodEnd: null,
          extendedDays: 0,
        }),
      );
    }

    // 3. Gera a cobrança no gateway (fora de transação: chamada de rede).
    const charge = await this.paymentGateway.createCharge({
      source: command.source,
      amount: plan.amount,
      externalReference: `${command.source}:${command.externalId}:${subscription.id}`,
    });

    // 4. Registra a cobrança PENDING. O vencimento só muda na confirmação.
    const payment = await this.paymentRepository.create(
      new SubscriptionPaymentModel({
        subscriptionId: subscription.id,
        source: command.source,
        amount: plan.amount,
        gatewayChargeId: charge.gatewayChargeId,
        status: SubscriptionPaymentStatusEnum.PENDING,
        periodEnd: null,
      }),
    );

    this.logger.log(
      `[CreateSubscriptionCharge] pending paymentId=${payment.id} subscriptionId=${subscription.id} gatewayChargeId=${charge.gatewayChargeId}`,
    );

    return { subscription, payment, charge };
  }
}
