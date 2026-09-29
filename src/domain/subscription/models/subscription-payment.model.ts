import { SubscriptionPaymentStatusEnum } from '@domain/shared/enums/subscription-payment-status.enum';

/**
 * Model de domínio de uma cobrança de assinatura.
 *
 * A fonte da verdade da assinatura é o cliente no front (tabela `customers`
 * no Supabase). Esta tabela guarda apenas as cobranças geradas no gateway e
 * as concilia via webhook — ao confirmar, o cliente é prorrogado diretamente
 * no `customers`.
 *
 * O cliente é referenciado por (source, externalId):
 *   - source     = id do SaaS (saasId)
 *   - externalId = id do cliente no front (customer.id)
 *
 * Não há tabelas `plan` nem `subscription`: o valor e o intervalo de
 * renovação vivem na própria cobrança. Valores em centavos.
 */
export class SubscriptionPaymentModel {
  id: number;
  /** SaaS de origem (saasId). */
  source: string;
  /** Id do cliente no front (customer.id). */
  externalId: string;
  /** Valor cobrado, em centavos. */
  amount: number;
  /** Intervalo de renovação em dias (ex.: 30 = mensal). */
  intervalDays: number;
  /**
   * Id da cobrança no gateway. Chave de conciliação do webhook — que chega
   * apenas com este id.
   */
  gatewayChargeId: string;
  status: SubscriptionPaymentStatusEnum;
  /**
   * Novo vencimento aplicado ao cliente na confirmação deste pagamento.
   * Preenchido quando o pagamento é confirmado (trilha de auditoria).
   */
  paidPeriodEnd?: Date | null;
  createdAt?: Date;

  constructor(partial: Partial<SubscriptionPaymentModel>) {
    Object.assign(this, partial);
  }
}
