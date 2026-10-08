package com.saas.payment.domain.subscription.usecases;

/**
 * Dados de entrada para criar uma cobranca de assinatura e gerar o QR Code no
 * gateway.
 *
 * <p>A assinatura e do cliente do front, referenciado por (source, externalId).
 * Nao ha tabela de plano: o valor e o intervalo vem na propria requisicao (o
 * front define ao cadastrar o cliente; mensal = 30 dias).
 *
 * @param source       SaaS de origem (saasId).
 * @param externalId   id do cliente no front (customer.id).
 * @param amount       valor a cobrar, em centavos (inteiro positivo).
 * @param intervalDays intervalo de renovacao em dias; null => default 30.
 */
public record CreateSubscriptionChargeCommand(String source, String externalId, long amount,
                                              Integer intervalDays) {
}
