package com.saas.payment.api.dtos;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * Corpo do request para criar um deposito.
 *
 * <p>O cliente informa o valor (e opcionalmente uma referencia de idempotencia)
 * e o servico gera, junto ao gateway, o QR Code para pagamento.
 */
public class CreateDepositDto {

    @Schema(example = "10050", description = "Valor a depositar, em centavos (inteiro positivo).")
    @NotNull
    @Positive
    private Long amount;

    @Schema(example = "tx_abc123", description =
            "Referencia da transacao no sistema de origem. Usada para idempotencia: "
                    + "o mesmo deposito nao gera duas cobrancas.")
    private String externalReference;

    public Long getAmount() {
        return amount;
    }

    public void setAmount(Long amount) {
        this.amount = amount;
    }

    public String getExternalReference() {
        return externalReference;
    }

    public void setExternalReference(String externalReference) {
        this.externalReference = externalReference;
    }
}
