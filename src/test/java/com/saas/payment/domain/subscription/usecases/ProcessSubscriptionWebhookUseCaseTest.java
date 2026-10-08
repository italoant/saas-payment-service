package com.saas.payment.domain.subscription.usecases;

import com.saas.payment.domain.shared.enums.SubscriptionPaymentStatusEnum;
import com.saas.payment.domain.shared.exceptions.NotFoundException;
import com.saas.payment.domain.shared.ports.TransactionManagerPort;
import com.saas.payment.domain.shared.ports.TransactionManagerPort.TransactionContext;
import com.saas.payment.domain.subscription.models.CustomerSubscriptionModel;
import com.saas.payment.domain.subscription.models.SubscriptionPaymentModel;
import com.saas.payment.domain.subscription.ports.CustomerRepositoryPort;
import com.saas.payment.domain.subscription.ports.SubscriptionPaymentRepositoryPort;
import com.saas.payment.domain.subscription.ports.SubscriptionPaymentRepositoryPort.SettlementData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Espelha process-subscription-webhook.use-case.spec.ts.
 */
class ProcessSubscriptionWebhookUseCaseTest {

    private TransactionManagerPort transactionManager;
    private SubscriptionPaymentRepositoryPort paymentRepository;
    private CustomerRepositoryPort customerRepository;
    private ProcessSubscriptionWebhookUseCase useCase;

    private SubscriptionPaymentModel pendingPayment(SubscriptionPaymentStatusEnum status) {
        SubscriptionPaymentModel m = new SubscriptionPaymentModel();
        m.setId(20L);
        m.setSource("saas-a");
        m.setExternalId("cli-123");
        m.setAmount(4990L);
        m.setIntervalDays(30);
        m.setGatewayChargeId("stub_charge_1");
        m.setStatus(status);
        return m;
    }

    @BeforeEach
    void setUp() {
        transactionManager = mock(TransactionManagerPort.class);
        paymentRepository = mock(SubscriptionPaymentRepositoryPort.class);
        customerRepository = mock(CustomerRepositoryPort.class);

        when(transactionManager.runInTransaction(any())).thenAnswer(inv -> {
            Function<TransactionContext, Object> work = inv.getArgument(0);
            return work.apply(null);
        });
        when(paymentRepository.findByGatewayChargeId(any(), any()))
                .thenReturn(pendingPayment(SubscriptionPaymentStatusEnum.PENDING));
        when(customerRepository.findById(any(), any()))
                .thenReturn(new CustomerSubscriptionModel("cli-123", "devendo", null));

        useCase = new ProcessSubscriptionWebhookUseCase(transactionManager, paymentRepository,
                customerRepository);
    }

    @Test
    void confirmaPagamentoMarcaClientePagoEProrroga30Dias() {
        ProcessSubscriptionWebhookUseCase.ProcessSubscriptionWebhookResult result = useCase.execute(
                new ProcessSubscriptionWebhookCommand("stub_charge_1", "paid",
                        Map.of("id", "stub_charge_1", "status", "paid")));

        ArgumentCaptor<Instant> dueCaptor = ArgumentCaptor.forClass(Instant.class);
        verify(customerRepository).markPaid(eq("cli-123"), dueCaptor.capture(), any());
        long diffDays = Math.round(
                Duration.between(Instant.now(), dueCaptor.getValue()).toMillis() / (24.0 * 60 * 60 * 1000));
        assertThat(diffDays).isEqualTo(30);

        ArgumentCaptor<SettlementData> settleCaptor = ArgumentCaptor.forClass(SettlementData.class);
        verify(paymentRepository).updateSettlement(eq(20L), settleCaptor.capture(), any());
        assertThat(settleCaptor.getValue().status()).isEqualTo(SubscriptionPaymentStatusEnum.PAID);

        assertThat(result.status()).isEqualTo(SubscriptionPaymentStatusEnum.PAID);
        assertThat(result.customerId()).isEqualTo("cli-123");
    }

    @Test
    void renovacaoEmDiaEstendeDoVencimentoVigente() {
        Instant futureDue = Instant.now().plus(Duration.ofDays(10));
        when(customerRepository.findById(any(), any()))
                .thenReturn(new CustomerSubscriptionModel("cli-123", "pago", futureDue.toString()));

        useCase.execute(new ProcessSubscriptionWebhookCommand("stub_charge_1", "paid", Map.of()));

        ArgumentCaptor<Instant> dueCaptor = ArgumentCaptor.forClass(Instant.class);
        verify(customerRepository).markPaid(eq("cli-123"), dueCaptor.capture(), any());
        long diffDays = Math.round(
                Duration.between(Instant.now(), dueCaptor.getValue()).toMillis() / (24.0 * 60 * 60 * 1000));
        // 10 restantes + 30 do intervalo = ~40.
        assertThat(diffDays).isEqualTo(40);
    }

    @Test
    void assumeConfirmacaoQuandoNaoHaStatus() {
        useCase.execute(new ProcessSubscriptionWebhookCommand("stub_charge_1", null, Map.of()));
        verify(customerRepository).markPaid(any(), any(), any());
    }

    @Test
    void lanca404QuandoNaoHaCobranca() {
        when(paymentRepository.findByGatewayChargeId(any(), any())).thenReturn(null);
        assertThatThrownBy(() -> useCase.execute(
                new ProcessSubscriptionWebhookCommand("x", null, Map.of())))
                .isInstanceOf(NotFoundException.class);
        verify(customerRepository, never()).markPaid(any(), any(), any());
    }

    @Test
    void lanca404QuandoClienteNaoExiste() {
        when(customerRepository.findById(any(), any())).thenReturn(null);
        assertThatThrownBy(() -> useCase.execute(
                new ProcessSubscriptionWebhookCommand("stub_charge_1", "paid", Map.of())))
                .isInstanceOf(NotFoundException.class);
        verify(customerRepository, never()).markPaid(any(), any(), any());
    }

    @Test
    void naoProrrogaEMarcaFailedQuandoStatusNaoEhPagamento() {
        ProcessSubscriptionWebhookUseCase.ProcessSubscriptionWebhookResult result = useCase.execute(
                new ProcessSubscriptionWebhookCommand("stub_charge_1", "expired", Map.of()));

        verify(customerRepository, never()).markPaid(any(), any(), any());
        ArgumentCaptor<SettlementData> settleCaptor = ArgumentCaptor.forClass(SettlementData.class);
        verify(paymentRepository).updateSettlement(anyLong(), settleCaptor.capture(), any());
        assertThat(settleCaptor.getValue().status()).isEqualTo(SubscriptionPaymentStatusEnum.FAILED);
        assertThat(result.status()).isEqualTo(SubscriptionPaymentStatusEnum.FAILED);
    }

    @Test
    void idempotenteCobrancaJaPaidNaoProrrogaDeNovo() {
        when(paymentRepository.findByGatewayChargeId(any(), any()))
                .thenReturn(pendingPayment(SubscriptionPaymentStatusEnum.PAID));
        ProcessSubscriptionWebhookUseCase.ProcessSubscriptionWebhookResult result = useCase.execute(
                new ProcessSubscriptionWebhookCommand("stub_charge_1", "paid", Map.of()));

        verify(customerRepository, never()).markPaid(any(), any(), any());
        verify(customerRepository, never()).findById(any(), any());
        assertThat(result.status()).isEqualTo(SubscriptionPaymentStatusEnum.PAID);
    }
}
