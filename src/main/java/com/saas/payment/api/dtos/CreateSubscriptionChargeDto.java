package com.saas.payment.api.dtos;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Corpo do request para criar uma cobranca de assinatura.
 *
 * <p>A rota e parametrizada por {@code :source} (o SaaS). O corpo identifica o
 * cliente do front (externalId = customer.id) e informa valor e intervalo (o
 * front define ao cadastrar; mensal = 30 dias).
 */
public class CreateSubscriptionChargeDto {

    @Schema(example = "cli-abc123", description = "Id do cliente no front (customer.id).")
    @NotNull
    @Size(max = 255)
    private String externalId;

    @Schema(example = "4990", description = "Valor a cobrar, em centavos (inteiro positivo).")
    @NotNull
    @Positive
    private Long amount;

    @Schema(example = "30", description = "Intervalo de renovacao em dias (default 30 = mensal).")
    @Positive
    private Integer intervalDays;

    public String getExternalId() {
        return externalId;
    }

    public void setExternalId(String externalId) {
        this.externalId = externalId;
    }

    public Long getAmount() {
        return amount;
    }

    public void setAmount(Long amount) {
        this.amount = amount;
    }

    public Integer getIntervalDays() {
        return intervalDays;
    }

    public void setIntervalDays(Integer intervalDays) {
        this.intervalDays = intervalDays;
    }
}
