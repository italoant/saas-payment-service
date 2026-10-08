package com.saas.payment.domain.deposit.usecases;

import java.util.Map;

/**
 * Dados de entrada para processar a confirmacao de um deposito vinda do
 * gateway. O gateway envia apenas o id da cobranca (e opcionalmente um
 * status); o servico descobre o resto pela transacao pendente.
 *
 * @param gatewayChargeId id da cobranca no gateway (chave de conciliacao).
 * @param status          status informado pelo gateway, quando houver (null caso contrario).
 * @param rawPayload      payload cru completo, gravado no log.
 */
public record ProcessDepositWebhookCommand(String gatewayChargeId, String status,
                                           Map<String, Object> rawPayload) {
}
