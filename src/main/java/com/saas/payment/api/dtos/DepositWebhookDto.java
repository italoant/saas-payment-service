package com.saas.payment.api.dtos;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Corpo do webhook de confirmacao enviado pelo gateway.
 *
 * <p>O gateway nao conhece o {@code source} nem a referencia do SaaS: ele
 * informa apenas o id da cobranca que geramos ao criar o deposito. O servico
 * usa esse id para localizar a transacao pendente e descobrir todo o resto.
 */
public class DepositWebhookDto {

    @Schema(example = "stub_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", description =
            "Id da cobranca no gateway (o gatewayChargeId retornado na criacao do deposito). "
                    + "Chave de conciliacao.")
    @NotNull
    @Size(max = 255)
    private String id;

    @Schema(example = "paid", description =
            "Status informado pelo gateway. Opcional: qualquer valor diferente de um status "
                    + "de pagamento confirmado nao credita o saldo.")
    private String status;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
