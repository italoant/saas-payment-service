import { SubscriptionPaymentModel } from '@domain/subscription/models/subscription-payment.model';
import { SubscriptionPaymentStatusEnum } from '@domain/shared/enums/subscription-payment-status.enum';
import { TransactionContext } from '@domain/shared/ports/transaction-manager.port';

export interface SubscriptionPaymentRepositoryPort {
  /** Cria uma cobrança de assinatura (PENDING). */
  create(
    data: SubscriptionPaymentModel,
    ctx?: TransactionContext,
  ): Promise<SubscriptionPaymentModel>;

  /**
   * Busca uma cobrança pelo id da cobrança no gateway. Usada pelo webhook —
   * que chega apenas com esse id — para localizar a assinatura a prorrogar.
   */
  findByGatewayChargeId(
    gatewayChargeId: string,
    ctx?: TransactionContext,
  ): Promise<SubscriptionPaymentModel | null>;

  /** Atualiza o status/período de uma cobrança na confirmação do pagamento. */
  updateSettlement(
    id: number,
    data: {
      status: SubscriptionPaymentStatusEnum;
      periodEnd: Date | null;
    },
    ctx?: TransactionContext,
  ): Promise<SubscriptionPaymentModel>;
}
