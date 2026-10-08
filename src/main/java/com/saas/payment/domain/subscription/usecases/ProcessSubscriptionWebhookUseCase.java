package com.saas.payment.domain.subscription.usecases;

import com.saas.payment.domain.shared.PaidStatuses;
import com.saas.payment.domain.shared.enums.SubscriptionPaymentStatusEnum;
import com.saas.payment.domain.shared.exceptions.NotFoundException;
import com.saas.payment.domain.shared.ports.TransactionManagerPort;
import com.saas.payment.domain.subscription.SubscriptionPeriod;
import com.saas.payment.domain.subscription.models.CustomerSubscriptionModel;
import com.saas.payment.domain.subscription.models.SubscriptionPaymentModel;
import com.saas.payment.domain.subscription.ports.CustomerRepositoryPort;
import com.saas.payment.domain.subscription.ports.SubscriptionPaymentRepositoryPort;
import com.saas.payment.domain.subscription.ports.SubscriptionPaymentRepositoryPort.SettlementData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;

/**
 * Confirma o pagamento de uma cobranca a partir do webhook do gateway e
 * prorroga a assinatura DIRETAMENTE no cliente (tabela {@code customers}, fonte
 * da verdade). Fluxo:
 *
 * <ol>
 *   <li>localiza a cobranca PENDING pelo gatewayChargeId (o gateway so manda o
 *       id) — dela saem o cliente (source+externalId) e o intervalo;</li>
 *   <li>se o status nao for de pagamento confirmado, marca a cobranca FAILED e
 *       nao prorroga;</li>
 *   <li>idempotencia: cobranca ja PAID nao prorroga de novo;</li>
 *   <li>numa transacao atomica: calcula o novo vencimento a partir do
 *       vencimento atual do cliente + intervalo, marca o cliente como pago com
 *       o novo vencimento e confirma a cobranca (PAID).</li>
 * </ol>
 *
 * <p>Depende apenas de ports.
 */
public class ProcessSubscriptionWebhookUseCase {

    private static final Logger log = LoggerFactory.getLogger(ProcessSubscriptionWebhookUseCase.class);

    /** Resultado: a cobranca e o vencimento aplicado (se pago). */
    public record ProcessSubscriptionWebhookResult(long paymentId, SubscriptionPaymentStatusEnum status,
                                                   String customerId, Instant newDueDate) {
    }

    private final TransactionManagerPort transactionManager;
    private final SubscriptionPaymentRepositoryPort paymentRepository;
    private final CustomerRepositoryPort customerRepository;

    public ProcessSubscriptionWebhookUseCase(TransactionManagerPort transactionManager,
                                             SubscriptionPaymentRepositoryPort paymentRepository,
                                             CustomerRepositoryPort customerRepository) {
        this.transactionManager = transactionManager;
        this.paymentRepository = paymentRepository;
        this.customerRepository = customerRepository;
    }

    public ProcessSubscriptionWebhookResult execute(ProcessSubscriptionWebhookCommand command) {
        log.info("[SubscriptionWebhook] gatewayChargeId={} status={}",
                command.gatewayChargeId(), command.status() != null ? command.status() : "-");

        // 1. Localiza a cobranca pendente.
        SubscriptionPaymentModel payment =
                paymentRepository.findByGatewayChargeId(command.gatewayChargeId(), null);
        if (payment == null) {
            log.warn("[SubscriptionWebhook] Nenhuma cobranca para gatewayChargeId={}", command.gatewayChargeId());
            throw new NotFoundException(
                    "No payment found for gatewayChargeId=" + command.gatewayChargeId());
        }

        // 2. Status nao confirmado: marca FAILED e nao prorroga.
        if (command.status() != null && !PaidStatuses.isPaid(command.status())) {
            log.warn("[SubscriptionWebhook] status nao confirmado ({}) paymentId={}; sem prorrogacao",
                    command.status(), payment.getId());
            paymentRepository.updateSettlement(payment.getId(),
                    new SettlementData(SubscriptionPaymentStatusEnum.FAILED, null), null);
            return new ProcessSubscriptionWebhookResult(
                    payment.getId(), SubscriptionPaymentStatusEnum.FAILED, payment.getExternalId(), null);
        }

        // 3. Idempotencia: ja confirmada, nao prorroga de novo.
        if (payment.getStatus() == SubscriptionPaymentStatusEnum.PAID) {
            log.warn("[SubscriptionWebhook] Evento duplicado ignorado paymentId={}", payment.getId());
            return new ProcessSubscriptionWebhookResult(
                    payment.getId(), SubscriptionPaymentStatusEnum.PAID, payment.getExternalId(),
                    payment.getPaidPeriodEnd());
        }

        // 4. Localiza o cliente (fonte da verdade) para calcular a prorrogacao.
        CustomerSubscriptionModel customer = customerRepository.findById(payment.getExternalId(), null);
        if (customer == null) {
            throw new NotFoundException("Customer not found id=" + payment.getExternalId());
        }

        Instant paidAt = Instant.now();
        Instant currentDue = customer.getSubDueDate() != null
                ? Instant.parse(customer.getSubDueDate())
                : null;
        Instant newDueDate = SubscriptionPeriod.nextPeriodEnd(currentDue, payment.getIntervalDays(), paidAt);

        // Transacao atomica: prorroga o cliente e confirma a cobranca juntos.
        transactionManager.runInTransaction(ctx -> {
            customerRepository.markPaid(customer.getId(), newDueDate, ctx);
            paymentRepository.updateSettlement(payment.getId(),
                    new SettlementData(SubscriptionPaymentStatusEnum.PAID, newDueDate), ctx);
            return null;
        });

        log.info("[SubscriptionWebhook] paid paymentId={} customerId={} newDueDate={}",
                payment.getId(), customer.getId(), newDueDate);

        return new ProcessSubscriptionWebhookResult(
                payment.getId(), SubscriptionPaymentStatusEnum.PAID, customer.getId(), newDueDate);
    }
}
