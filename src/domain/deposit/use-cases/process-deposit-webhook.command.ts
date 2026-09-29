/**
 * Dados de entrada para processar a confirmação de um depósito vinda do
 * gateway. O gateway envia apenas o id da cobrança (e opcionalmente um
 * status); o serviço descobre o resto pela transação pendente.
 */
export interface ProcessDepositWebhookCommand {
  /** Id da cobrança no gateway. Chave de conciliação. */
  gatewayChargeId: string;
  /** Status informado pelo gateway, quando houver. */
  status?: string;
  /** Payload cru completo, gravado no log. */
  rawPayload: Record<string, unknown>;
}
