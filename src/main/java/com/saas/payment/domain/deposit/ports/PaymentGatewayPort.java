package com.saas.payment.domain.deposit.ports;

import java.time.Instant;

/**
 * Port de saida para o gateway de pagamento.
 *
 * <p>O dominio depende apenas desta abstracao. A implementacao concreta (o
 * gateway que sera integrado) vive na infraestrutura e e plugada por um
 * adapter, sem que o use-case conheca o provedor.
 */
public interface PaymentGatewayPort {

    /**
     * Dados enviados ao gateway para gerar uma cobranca de deposito.
     *
     * @param source            SaaS de origem do deposito.
     * @param amount            valor a cobrar, em centavos (inteiro positivo).
     * @param externalReference referencia da transacao no sistema de origem
     *                          (conciliacao/idempotencia); pode ser null.
     */
    record CreateGatewayChargeInput(String source, long amount, String externalReference) {
    }

    /**
     * Resultado da criacao de uma cobranca no gateway: os dados do QR Code que
     * o cliente usa para pagar (PIX).
     *
     * @param gatewayChargeId identificador da cobranca no gateway.
     * @param qrCodePayload   payload copia-e-cola do PIX (BR Code / EMV).
     * @param qrCodeImage     imagem do QR Code em data URI (base64), ou null.
     * @param expiresAt       momento de expiracao, ou null.
     */
    record GatewayChargeResult(String gatewayChargeId, String qrCodePayload, String qrCodeImage,
                               Instant expiresAt) {
    }

    /**
     * Cria uma cobranca no gateway e retorna os dados do QR Code para pagamento.
     */
    GatewayChargeResult createCharge(CreateGatewayChargeInput input);
}
