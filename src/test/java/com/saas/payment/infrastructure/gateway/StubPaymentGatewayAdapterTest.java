package com.saas.payment.infrastructure.gateway;

import com.saas.payment.domain.deposit.ports.PaymentGatewayPort.CreateGatewayChargeInput;
import com.saas.payment.domain.deposit.ports.PaymentGatewayPort.GatewayChargeResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Espelha stub-payment-gateway.adapter.spec.ts.
 */
class StubPaymentGatewayAdapterTest {

    private StubPaymentGatewayAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new StubPaymentGatewayAdapter();
    }

    @Test
    void geraCobrancaComIdPayloadEExpiracao() {
        Instant before = Instant.now();
        GatewayChargeResult result = adapter.createCharge(
                new CreateGatewayChargeInput("saas-a", 10050L, "tx_abc"));

        assertThat(result.gatewayChargeId()).startsWith("stub_");
        assertThat(result.qrCodePayload()).isNotEmpty();
        assertThat(result.qrCodePayload()).contains("source:saas-a");
        assertThat(result.qrCodePayload()).contains("amount:10050");
        assertThat(result.qrCodePayload()).contains("ref:tx_abc");
        assertThat(result.expiresAt()).isNotNull();
        assertThat(result.expiresAt()).isAfter(before);
    }

    @Test
    void usaRefTracoQuandoNaoHaExternalReference() {
        GatewayChargeResult result = adapter.createCharge(
                new CreateGatewayChargeInput("saas-b", 500L, null));
        assertThat(result.qrCodePayload()).contains("ref:-");
    }

    @Test
    void geraIdsDistintosACadaChamada() {
        GatewayChargeResult a = adapter.createCharge(new CreateGatewayChargeInput("s", 1L, null));
        GatewayChargeResult b = adapter.createCharge(new CreateGatewayChargeInput("s", 1L, null));
        assertThat(a.gatewayChargeId()).isNotEqualTo(b.gatewayChargeId());
    }
}
