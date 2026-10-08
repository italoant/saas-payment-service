package com.saas.payment.domain.subscription.usecases;

import java.util.Map;

/**
 * Dados de entrada para processar a confirmacao de um pagamento de assinatura
 * vinda do gateway. O gateway envia apenas o id da cobranca (e opcionalmente um
 * status); o servico descobre a assinatura pela cobranca pendente.
 *
 * @param gatewayChargeId id da cobranca no gateway (chave de conciliacao).
 * @param status          status informado pelo gateway, quando houver (null caso contrario).
 * @param rawPayload      payload cru completo (para auditoria/log).
 */
public record ProcessSubscriptionWebhookCommand(String gatewayChargeId, String status,
                                                Map<String, Object> rawPayload) {
}
