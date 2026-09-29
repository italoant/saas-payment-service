import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CUSTOMER_REPOSITORY,
  SUBSCRIPTION_PAYMENT_REPOSITORY,
  TRANSACTION_MANAGER,
} from '@domain/shared/ports/tokens';
import { TransactionManagerPort } from '@domain/shared/ports/transaction-manager.port';
import { SubscriptionPaymentRepositoryPort } from '@domain/subscription/ports/subscription-payment-repository.port';
import { CustomerRepositoryPort } from '@domain/subscription/ports/customer-repository.port';
import { SubscriptionPaymentStatusEnum } from '@domain/shared/enums/subscription-payment-status.enum';
import { nextPeriodEnd } from '@domain/subscription/subscription-period';
import { ProcessSubscriptionWebhookCommand } from './process-subscription-webhook.command';

/**
 * Status que o gateway pode enviar para indicar pagamento confirmado. Quando
 * `status` não vier, assumimos confirmação (o webhook só é chamado em eventos
 * de pagamento).
 */
const PAID_STATUSES = new Set([
  'paid',
  'approved',
  'confirmed',
  'completed',
  'success',
  'succeeded',
]);

/** Resultado do processamento: a cobrança e o vencimento aplicado (se pago). */
export interface ProcessSubscriptionWebhookResult {
  paymentId: number;
  status: SubscriptionPaymentStatusEnum;
  customerId: string;
  newDueDate: Date | null;
}

/**
 * Confirma o pagamento de uma cobrança a partir do webhook do gateway e
 * prorroga a assinatura DIRETAMENTE no cliente (tabela `customers`, fonte da
 * verdade). Fluxo:
 *
 *   1. localiza a cobrança PENDING pelo gatewayChargeId (o gateway só manda o
 *      id) — dela saem o cliente (source+externalId) e o intervalo;
 *   2. se o status não for de pagamento confirmado, marca a cobrança FAILED e
 *      não prorroga;
 *   3. idempotência: cobrança já PAID não prorroga de novo;
 *   4. numa transação atômica: calcula o novo vencimento a partir do
 *      vencimento atual do cliente + intervalo, marca o cliente como pago com
 *      o novo vencimento e confirma a cobrança (PAID).
 *
 * Depende apenas de ports.
 */
@Injectable()
export class ProcessSubscriptionWebhookUseCase {
  private readonly logger = new Logger(ProcessSubscriptionWebhookUseCase.name);

  constructor(
    @Inject(TRANSACTION_MANAGER)
    private readonly transactionManager: TransactionManagerPort,
    @Inject(SUBSCRIPTION_PAYMENT_REPOSITORY)
    private readonly paymentRepository: SubscriptionPaymentRepositoryPort,
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepository: CustomerRepositoryPort,
  ) {}

  async execute(
    command: ProcessSubscriptionWebhookCommand,
  ): Promise<ProcessSubscriptionWebhookResult> {
    this.logger.log(
      `[SubscriptionWebhook] gatewayChargeId=${command.gatewayChargeId} status=${command.status ?? '-'}`,
    );

    // 1. Localiza a cobrança pendente.
    const payment = await this.paymentRepository.findByGatewayChargeId(
      command.gatewayChargeId,
    );
    if (!payment) {
      this.logger.warn(
        `[SubscriptionWebhook] Nenhuma cobrança para gatewayChargeId=${command.gatewayChargeId}`,
      );
      throw new NotFoundException(
        `No payment found for gatewayChargeId=${command.gatewayChargeId}`,
      );
    }

    // 2. Status não confirmado: marca FAILED e não prorroga.
    if (
      command.status &&
      !PAID_STATUSES.has(command.status.trim().toLowerCase())
    ) {
      this.logger.warn(
        `[SubscriptionWebhook] status não confirmado (${command.status}) paymentId=${payment.id}; sem prorrogação`,
      );
      await this.paymentRepository.updateSettlement(payment.id, {
        status: SubscriptionPaymentStatusEnum.FAILED,
        paidPeriodEnd: null,
      });
      return {
        paymentId: payment.id,
        status: SubscriptionPaymentStatusEnum.FAILED,
        customerId: payment.externalId,
        newDueDate: null,
      };
    }

    // 3. Idempotência: já confirmada, não prorroga de novo.
    if (payment.status === SubscriptionPaymentStatusEnum.PAID) {
      this.logger.warn(
        `[SubscriptionWebhook] Evento duplicado ignorado paymentId=${payment.id}`,
      );
      return {
        paymentId: payment.id,
        status: SubscriptionPaymentStatusEnum.PAID,
        customerId: payment.externalId,
        newDueDate: payment.paidPeriodEnd ?? null,
      };
    }

    // 4. Localiza o cliente (fonte da verdade) para calcular a prorrogação.
    const customer = await this.customerRepository.findById(payment.externalId);
    if (!customer) {
      throw new NotFoundException(
        `Customer not found id=${payment.externalId}`,
      );
    }

    const paidAt = new Date();
    const currentDue = customer.subDueDate
      ? new Date(customer.subDueDate)
      : null;
    const newDueDate = nextPeriodEnd(currentDue, payment.intervalDays, paidAt);

    // Transação atômica: prorroga o cliente e confirma a cobrança juntos.
    await this.transactionManager.runInTransaction(async (ctx) => {
      await this.customerRepository.markPaid(customer.id, newDueDate, ctx);
      await this.paymentRepository.updateSettlement(
        payment.id,
        {
          status: SubscriptionPaymentStatusEnum.PAID,
          paidPeriodEnd: newDueDate,
        },
        ctx,
      );
    });

    this.logger.log(
      `[SubscriptionWebhook] paid paymentId=${payment.id} customerId=${customer.id} newDueDate=${newDueDate.toISOString()}`,
    );

    return {
      paymentId: payment.id,
      status: SubscriptionPaymentStatusEnum.PAID,
      customerId: customer.id,
      newDueDate,
    };
  }
}
