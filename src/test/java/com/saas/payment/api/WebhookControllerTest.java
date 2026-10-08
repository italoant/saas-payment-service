package com.saas.payment.api;

import com.saas.payment.api.dtos.DepositWebhookDto;
import com.saas.payment.domain.deposit.usecases.ProcessDepositWebhookCommand;
import com.saas.payment.domain.deposit.usecases.ProcessDepositWebhookUseCase;
import com.saas.payment.domain.shared.enums.TransactionStatusEnum;
import com.saas.payment.domain.wallet.models.WalletTransactionHistoryModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Espelha webhook.controller.spec.ts.
 */
class WebhookControllerTest {

    private ProcessDepositWebhookUseCase processDepositWebhook;
    private WebhookController controller;

    @BeforeEach
    void setUp() {
        processDepositWebhook = mock(ProcessDepositWebhookUseCase.class);

        WalletTransactionHistoryModel tx = new WalletTransactionHistoryModel();
        tx.setId(10L);
        tx.setSource("saas-a");
        tx.setPreviousBalance(5000L);
        tx.setNewBalance(15050L);
        tx.setStatus(TransactionStatusEnum.COMPLETED);
        when(processDepositWebhook.execute(any())).thenReturn(tx);

        controller = new WebhookController(processDepositWebhook);
    }

    @Test
    void repassaIdDaCobrancaEMontaResposta() {
        DepositWebhookDto body = new DepositWebhookDto();
        body.setId("stub_charge_1");
        body.setStatus("paid");

        Map<String, Object> response = controller.handle(body);

        ArgumentCaptor<ProcessDepositWebhookCommand> cmdCaptor =
                ArgumentCaptor.forClass(ProcessDepositWebhookCommand.class);
        verify(processDepositWebhook).execute(cmdCaptor.capture());
        assertThat(cmdCaptor.getValue().gatewayChargeId()).isEqualTo("stub_charge_1");
        assertThat(cmdCaptor.getValue().status()).isEqualTo("paid");
        assertThat(cmdCaptor.getValue().rawPayload())
                .containsEntry("id", "stub_charge_1")
                .containsEntry("status", "paid");

        assertThat(response.get("transactionId")).isEqualTo(10L);
        assertThat(response.get("source")).isEqualTo("saas-a");
        assertThat(response.get("previousBalance")).isEqualTo(5000L);
        assertThat(response.get("newBalance")).isEqualTo(15050L);
        assertThat(response.get("status")).isEqualTo("completed");
    }
}
