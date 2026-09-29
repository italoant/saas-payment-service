/**
 * Dados de entrada para criar uma cobrança de assinatura e gerar o QR Code no
 * gateway.
 *
 * A assinatura é do cliente do front, referenciado por (source, externalId).
 * Não há tabela de plano: o valor e o intervalo vêm na própria requisição
 * (o front define ao cadastrar o cliente; mensal = 30 dias).
 */
export interface CreateSubscriptionChargeCommand {
  /** SaaS de origem (saasId). */
  source: string;
  /** Id do cliente no front (customer.id). */
  externalId: string;
  /** Valor a cobrar, em centavos (inteiro positivo). */
  amount: number;
  /** Intervalo de renovação em dias (ex.: 30 = mensal). Default 30. */
  intervalDays?: number;
}
