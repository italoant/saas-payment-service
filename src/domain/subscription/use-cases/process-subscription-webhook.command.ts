/**
 * Dados de entrada para processar a confirmação de um pagamento de assinatura
 * vinda do gateway. O gateway envia apenas o id da cobrança (e opcionalmente
 * um status); o serviço descobre a assinatura pela cobrança pendente.
 */
export interface ProcessSubscriptionWebhookCommand {
  /** Id da cobrança no gateway. Chave de conciliação. */
  gatewayChargeId: string;
  /** Status informado pelo gateway, quando houver. */
  status?: string;
  /** Payload cru completo (para auditoria/log). */
  rawPayload: Record<string, unknown>;
}
