import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  PAYMENT_GATEWAY,
  SUBSCRIPTION_PAYMENT_REPOSITORY,
} from '@domain/shared/ports/tokens';
import {
  GatewayChargeResult,
  PaymentGatewayPort,
} from '@domain/deposit/ports/payment-gateway.port';
import { SubscriptionPaymentRepositoryPort } from '@domain/subscription/ports/subscription-payment-repository.port';
import { SubscriptionPaymentModel } from '@domain/subscription/models/subscription-payment.model';
import { SubscriptionPaymentStatusEnum } from '@domain/shared/enums/subscription-payment-status.enum';
import { CreateSubscriptionChargeCommand } from './create-subscription-charge.command';

/** Intervalo padrão de renovação (mensal). */
const DEFAULT_INTERVAL_DAYS = 30;

/**
 * Resultado da criação de uma cobrança: a cobrança PENDING registrada e os
 * dados do QR Code para pagamento.
 */
export interface CreateSubscriptionChargeResult {
  payment: SubscriptionPaymentModel;
  charge: GatewayChargeResult;
}

/**
 * Cria uma cobrança de assinatura para um cliente do front:
 *
 *   1. valida valor e intervalo;
 *   2. gera a cobrança no gateway (QR Code);
 *   3. registra a cobrança como PENDING referenciando o cliente
 *      (source + externalId) — o vencimento do cliente NÃO muda aqui; a
 *      prorrogação acontece quando o gateway confirmar o pagamento (webhook);
 *   4. retorna a cobrança e o QR Code.
 *
 * Depende apenas de ports — não conhece TypeORM nem o gateway concreto. Não há
 * `plan`/`subscription`: a fonte da verdade da assinatura é o `customers`.
 */
@Injectable()
export class CreateSubscriptionChargeUseCase {
  private readonly logger = new Logger(CreateSubscriptionChargeUseCase.name);

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGatewayPort,
    @Inject(SUBSCRIPTION_PAYMENT_REPOSITORY)
    private readonly paymentRepository: SubscriptionPaymentRepositoryPort,
  ) {}

  async execute(
    command: CreateSubscriptionChargeCommand,
  ): Promise<CreateSubscriptionChargeResult> {
    const intervalDays = command.intervalDays ?? DEFAULT_INTERVAL_DAYS;

    this.logger.log(
      `[CreateSubscriptionCharge] source=${command.source} externalId=${command.externalId} amount=${command.amount} intervalDays=${intervalDays}`,
    );

    if (!command.externalId?.trim()) {
      throw new BadRequestException('externalId is required');
    }
    if (!Number.isInteger(command.amount) || command.amount <= 0) {
      throw new BadRequestException(
        'amount must be a positive integer (cents)',
      );
    }
    if (!Number.isInteger(intervalDays) || intervalDays <= 0) {
      throw new BadRequestException(
        'intervalDays must be a positive integer (days)',
      );
    }

    // 1. Gera a cobrança no gateway (fora de transação: chamada de rede).
    const charge = await this.paymentGateway.createCharge({
      source: command.source,
      amount: command.amount,
      externalReference: `${command.source}:${command.externalId}`,
    });

    // 2. Registra a cobrança PENDING. O vencimento do cliente só muda na
    // confirmação (webhook).
    const payment = await this.paymentRepository.create(
      new SubscriptionPaymentModel({
        source: command.source,
        externalId: command.externalId,
        amount: command.amount,
        intervalDays,
        gatewayChargeId: charge.gatewayChargeId,
        status: SubscriptionPaymentStatusEnum.PENDING,
        paidPeriodEnd: null,
      }),
    );

    this.logger.log(
      `[CreateSubscriptionCharge] pending paymentId=${payment.id} gatewayChargeId=${charge.gatewayChargeId}`,
    );

    return { payment, charge };
  }
}
