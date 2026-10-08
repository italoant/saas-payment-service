package com.saas.payment.domain.subscription.usecases;

import com.saas.payment.domain.deposit.ports.PaymentGatewayPort;
import com.saas.payment.domain.deposit.ports.PaymentGatewayPort.CreateGatewayChargeInput;
import com.saas.payment.domain.deposit.ports.PaymentGatewayPort.GatewayChargeResult;
import com.saas.payment.domain.shared.enums.SubscriptionPaymentStatusEnum;
import com.saas.payment.domain.shared.exceptions.BadRequestException;
import com.saas.payment.domain.subscription.models.SubscriptionPaymentModel;
import com.saas.payment.domain.subscription.ports.SubscriptionPaymentRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Espelha create-subscription-charge.use-case.spec.ts.
 */
class CreateSubscriptionChargeUseCaseTest {

    private PaymentGatewayPort paymentGateway;
    private SubscriptionPaymentRepositoryPort paymentRepository;
    private CreateSubscriptionChargeUseCase useCase;

    @BeforeEach
    void setUp() {
        paymentGateway = mock(PaymentGatewayPort.class);
        paymentRepository = mock(SubscriptionPaymentRepositoryPort.class);

        when(paymentGateway.createCharge(any())).thenReturn(
                new GatewayChargeResult("stub_charge_1", "PIX-PAYLOAD", null, null));
        when(paymentRepository.create(any(), any())).thenAnswer(inv -> {
            SubscriptionPaymentModel m = inv.getArgument(0);
            m.setId(20L);
            return m;
        });

        useCase = new CreateSubscriptionChargeUseCase(paymentGateway, paymentRepository);
    }

    @Test
    void geraCobrancaERegistraPendingParaCliente() {
        CreateSubscriptionChargeUseCase.CreateSubscriptionChargeResult result = useCase.execute(
                new CreateSubscriptionChargeCommand("saas-a", "cli-123", 4990L, null));

        ArgumentCaptor<CreateGatewayChargeInput> chargeCaptor =
                ArgumentCaptor.forClass(CreateGatewayChargeInput.class);
        verify(paymentGateway).createCharge(chargeCaptor.capture());
        assertThat(chargeCaptor.getValue().source()).isEqualTo("saas-a");
        assertThat(chargeCaptor.getValue().amount()).isEqualTo(4990L);
        assertThat(chargeCaptor.getValue().externalReference()).isEqualTo("saas-a:cli-123");

        ArgumentCaptor<SubscriptionPaymentModel> createCaptor =
                ArgumentCaptor.forClass(SubscriptionPaymentModel.class);
        verify(paymentRepository).create(createCaptor.capture(), any());
        SubscriptionPaymentModel created = createCaptor.getValue();
        assertThat(created.getStatus()).isEqualTo(SubscriptionPaymentStatusEnum.PENDING);
        assertThat(created.getExternalId()).isEqualTo("cli-123");
        assertThat(created.getAmount()).isEqualTo(4990L);
        assertThat(created.getIntervalDays()).isEqualTo(30);
        assertThat(created.getPaidPeriodEnd()).isNull();

        assertThat(result.payment().getId()).isEqualTo(20L);
        assertThat(result.charge().gatewayChargeId()).isEqualTo("stub_charge_1");
    }

    @Test
    void respeitaIntervalDaysCustomizado() {
        useCase.execute(new CreateSubscriptionChargeCommand("saas-a", "cli-1", 1000L, 7));
        ArgumentCaptor<SubscriptionPaymentModel> captor =
                ArgumentCaptor.forClass(SubscriptionPaymentModel.class);
        verify(paymentRepository).create(captor.capture(), any());
        assertThat(captor.getValue().getIntervalDays()).isEqualTo(7);
    }

    @Test
    void rejeitaExternalIdVazio() {
        assertThatThrownBy(() -> useCase.execute(
                new CreateSubscriptionChargeCommand("saas-a", "  ", 1000L, null)))
                .isInstanceOf(BadRequestException.class);
        verify(paymentGateway, never()).createCharge(any());
    }

    @Test
    void rejeitaAmountNaoPositivo() {
        assertThatThrownBy(() -> useCase.execute(
                new CreateSubscriptionChargeCommand("saas-a", "cli-1", 0L, null)))
                .isInstanceOf(BadRequestException.class);
        verify(paymentGateway, never()).createCharge(any());
    }
}
