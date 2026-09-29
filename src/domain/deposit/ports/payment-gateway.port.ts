/**
 * Dados enviados ao gateway para gerar uma cobrança de depósito.
 */
export interface CreateGatewayChargeInput {
  /** SaaS de origem do depósito. */
  source: string;
  /** Valor a cobrar, em centavos (inteiro positivo). */
  amount: number;
  /**
   * Referência da transação no sistema de origem. Repassada ao gateway para
   * conciliação e usada como chave de idempotência.
   */
  externalReference?: string;
}

/**
 * Resultado da criação de uma cobrança no gateway: os dados do QR Code que o
 * cliente usa para pagar (PIX).
 */
export interface GatewayChargeResult {
  /** Identificador da cobrança no gateway (usado para conciliar o webhook). */
  gatewayChargeId: string;
  /** Payload copia-e-cola do PIX (BR Code / EMV). */
  qrCodePayload: string;
  /**
   * Imagem do QR Code em data URI (base64), quando o gateway a fornece.
   * Opcional: nem todo gateway retorna a imagem pronta.
   */
  qrCodeImage?: string;
  /** Momento de expiração da cobrança, quando informado pelo gateway. */
  expiresAt?: Date;
}

/**
 * Port de saída para o gateway de pagamento.
 *
 * O domínio depende apenas desta abstração. A implementação concreta (o
 * gateway que será integrado) vive na infraestrutura e é plugada por um
 * adapter, sem que o use-case conheça o provedor.
 */
export interface PaymentGatewayPort {
  /**
   * Cria uma cobrança no gateway e retorna os dados do QR Code para pagamento.
   */
  createCharge(input: CreateGatewayChargeInput): Promise<GatewayChargeResult>;
}
