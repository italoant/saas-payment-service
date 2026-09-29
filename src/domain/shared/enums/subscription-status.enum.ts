/**
 * Situação de uma assinatura no serviço de pagamento.
 *
 * O ciclo de vida espelha o do front de gestão, mas aqui a fonte da verdade
 * sobre pagamento e vencimento é o gateway (via webhook):
 *
 *   PENDING  -> assinatura criada, ainda sem o primeiro pagamento confirmado.
 *   ACTIVE   -> pagamento confirmado; período vigente (dentro do vencimento).
 *   PAST_DUE -> período venceu e ainda não houve novo pagamento confirmado.
 *   CANCELED -> encerrada; não gera novas cobranças.
 */
export enum SubscriptionStatusEnum {
  PENDING = 'pending',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
}
