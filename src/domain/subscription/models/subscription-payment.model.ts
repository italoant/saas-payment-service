import { SubscriptionPaymentStatusEnum } from '@domain/shared/enums/subscription-payment-status.enum';

/**
 * Model de domínio de uma cobrança de assinatura.
 *
 * Cada registro representa a cobrança de um período: gerada no gateway
 * (gatewayChargeId), confirmada via webhook. Ao confirmar, o período da
 * assinatura é prorrogado pelo intervalo do plano. Valores em centavos.
 */
export class SubscriptionPaymentModel {
  id: number;
  subscriptionId: number;
  /** SaaS de origem (desnormalizado da assinatura, para auditoria). */
  source: string;
  /** Valor cobrado no período, em centavos. */
  amount: number;
  /**
   * Id da cobrança no gateway. Chave de conciliação do webhook — que chega
   * apenas com este id.
   */
  gatewayChargeId: string;
  status: SubscriptionPaymentStatusEnum;
  /**
   * Fim do período que este pagamento cobriu (preenchido na confirmação).
   * Guarda a trilha de qual vencimento cada pagamento gerou.
   */
  periodEnd?: Date | null;
  createdAt?: Date;

  constructor(partial: Partial<SubscriptionPaymentModel>) {
    Object.assign(this, partial);
  }
}
