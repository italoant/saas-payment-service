package com.saas.payment.api;

import com.saas.payment.api.dtos.CreateDepositDto;
import com.saas.payment.domain.deposit.ports.PaymentGatewayPort.GatewayChargeResult;
import com.saas.payment.domain.deposit.usecases.CreateDepositCommand;
import com.saas.payment.domain.deposit.usecases.CreateDepositUseCase;
import com.saas.payment.domain.deposit.usecases.CreateDepositUseCase.CreateDepositResult;
import com.saas.payment.domain.shared.enums.TransactionStatusEnum;
import com.saas.payment.domain.wallet.models.WalletTransactionHistoryModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Espelha deposit.controller.spec.ts.
 */
class DepositControllerTest {

    private CreateDepositUseCase createDeposit;
    private DepositController controller;

    @BeforeEach
    void setUp() {
        createDeposit = mock(CreateDepositUseCase.class);

        WalletTransactionHistoryModel tx = new WalletTransactionHistoryModel();
        tx.setId(10L);
        tx.setAmount(10050L);
        tx.setStatus(TransactionStatusEnum.PENDING);
        GatewayChargeResult charge = new GatewayChargeResult(
                "stub_charge_1", "PIX-PAYLOAD", null, Instant.parse("2030-01-01T00:00:00Z"));
        when(createDeposit.execute(any())).thenReturn(new CreateDepositResult(tx, charge));

        controller = new DepositController(createDeposit);
    }

    @Test
    void repassaSourceEBodyEMontaRespostaComQrCode() {
        CreateDepositDto body = new CreateDepositDto();
        body.setAmount(10050L);
        body.setExternalReference("tx_abc");

        Map<String, Object> response = controller.handle("saas-a", body);

        ArgumentCaptor<CreateDepositCommand> cmdCaptor =
                ArgumentCaptor.forClass(CreateDepositCommand.class);
        verify(createDeposit).execute(cmdCaptor.capture());
        assertThat(cmdCaptor.getValue().source()).isEqualTo("saas-a");
        assertThat(cmdCaptor.getValue().amount()).isEqualTo(10050L);
        assertThat(cmdCaptor.getValue().externalReference()).isEqualTo("tx_abc");

        assertThat(response.get("transactionId")).isEqualTo(10L);
        assertThat(response.get("status")).isEqualTo("pending");
        assertThat(response.get("amount")).isEqualTo(10050L);
        assertThat(response.get("gatewayChargeId")).isEqualTo("stub_charge_1");

        @SuppressWarnings("unchecked")
        Map<String, Object> qrCode = (Map<String, Object>) response.get("qrCode");
        assertThat(qrCode.get("payload")).isEqualTo("PIX-PAYLOAD");
        assertThat(qrCode.get("image")).isNull();
        assertThat(qrCode.get("expiresAt")).isEqualTo(Instant.parse("2030-01-01T00:00:00Z"));
    }
}
