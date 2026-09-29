/**
 * Dados de entrada para criar uma cobrança de assinatura e gerar o QR Code no
 * gateway. Se a assinatura ainda não existe para (source, externalId), ela é
 * criada como PENDING; caso exista, uma nova cobrança de renovação é gerada.
 */
export interface CreateSubscriptionChargeCommand {
  /** SaaS de origem. */
  source: string;
  /** Identificador do cliente/assinatura no sistema de origem. */
  externalId: string;
  /** Plano a cobrar. Define valor e intervalo de renovação. */
  planId: number;
}
