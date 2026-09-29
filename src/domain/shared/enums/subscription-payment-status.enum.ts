/**
 * Situação de uma cobrança individual de assinatura
 * (`subscription_payment`).
 *
 *   PENDING -> cobrança criada no gateway, aguardando confirmação (webhook).
 *   PAID    -> pagamento confirmado; o período da assinatura foi prorrogado.
 *   FAILED  -> gateway informou status de não pagamento (ex.: expirado).
 */
export enum SubscriptionPaymentStatusEnum {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
