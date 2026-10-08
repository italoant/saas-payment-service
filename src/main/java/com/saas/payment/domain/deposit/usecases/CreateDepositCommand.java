package com.saas.payment.domain.deposit.usecases;

/**
 * Dados de entrada para criar um deposito e gerar a cobranca (QR Code) no
 * gateway, ja normalizados a partir do request da API.
 *
 * @param source            SaaS de origem do deposito.
 * @param amount            valor a depositar, em centavos (inteiro positivo).
 * @param externalReference referencia da transacao no sistema de origem; usada
 *                          para idempotencia (pode ser null).
 */
public record CreateDepositCommand(String source, long amount, String externalReference) {
}
