import { SubscriptionPaymentModel } from '@domain/subscription/models/subscription-payment.model';
import { SubscriptionPaymentStatusEnum } from '@domain/shared/enums/subscription-payment-status.enum';
import { TransactionContext } from '@domain/shared/ports/transaction-manager.port';

export interface SubscriptionPaymentRepositoryPort {
  /** Cria uma cobrança (PENDING). */
  create(
    data: SubscriptionPaymentModel,
    ctx?: TransactionContext,
  ): Promise<SubscriptionPaymentModel>;

  /**
   * Busca uma cobrança pelo id da cobrança no gateway. Usada pelo webhook —
   * que chega apenas com esse id — para localizar o cliente a prorrogar.
   */
  findByGatewayChargeId(
    gatewayChargeId: string,
    ctx?: TransactionContext,
  ): Promise<SubscriptionPaymentModel | null>;

  /** Atualiza status/vencimento aplicado na confirmação do pagamento. */
  updateSettlement(
    id: number,
    data: {
      status: SubscriptionPaymentStatusEnum;
      paidPeriodEnd: Date | null;
    },
    ctx?: TransactionContext,
  ): Promise<SubscriptionPaymentModel>;
}
