package com.saas.payment.domain.subscription.usecases;

import com.saas.payment.domain.deposit.ports.PaymentGatewayPort;
import com.saas.payment.domain.deposit.ports.PaymentGatewayPort.CreateGatewayChargeInput;
import com.saas.payment.domain.deposit.ports.PaymentGatewayPort.GatewayChargeResult;
import com.saas.payment.domain.shared.enums.SubscriptionPaymentStatusEnum;
import com.saas.payment.domain.shared.exceptions.BadRequestException;
import com.saas.payment.domain.subscription.models.SubscriptionPaymentModel;
import com.saas.payment.domain.subscription.ports.SubscriptionPaymentRepositoryPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Cria uma cobranca de assinatura para um cliente do front:
 *
 * <ol>
 *   <li>valida valor e intervalo;</li>
 *   <li>gera a cobranca no gateway (QR Code);</li>
 *   <li>registra a cobranca como PENDING referenciando o cliente
 *       (source + externalId) — o vencimento do cliente NAO muda aqui; a
 *       prorrogacao acontece quando o gateway confirmar o pagamento (webhook);</li>
 *   <li>retorna a cobranca e o QR Code.</li>
 * </ol>
 *
 * <p>Depende apenas de ports. Nao ha {@code plan}/{@code subscription}: a fonte
 * da verdade da assinatura e o {@code customers}.
 */
public class CreateSubscriptionChargeUseCase {

    private static final Logger log = LoggerFactory.getLogger(CreateSubscriptionChargeUseCase.class);

    /** Intervalo padrao de renovacao (mensal). */
    private static final int DEFAULT_INTERVAL_DAYS = 30;

    /** Resultado: a cobranca PENDING registrada e os dados do QR Code. */
    public record CreateSubscriptionChargeResult(SubscriptionPaymentModel payment, GatewayChargeResult charge) {
    }

    private final PaymentGatewayPort paymentGateway;
    private final SubscriptionPaymentRepositoryPort paymentRepository;

    public CreateSubscriptionChargeUseCase(PaymentGatewayPort paymentGateway,
                                           SubscriptionPaymentRepositoryPort paymentRepository) {
        this.paymentGateway = paymentGateway;
        this.paymentRepository = paymentRepository;
    }

    public CreateSubscriptionChargeResult execute(CreateSubscriptionChargeCommand command) {
        int intervalDays = command.intervalDays() != null ? command.intervalDays() : DEFAULT_INTERVAL_DAYS;

        log.info("[CreateSubscriptionCharge] source={} externalId={} amount={} intervalDays={}",
                command.source(), command.externalId(), command.amount(), intervalDays);

        if (command.externalId() == null || command.externalId().trim().isEmpty()) {
            throw new BadRequestException("externalId is required");
        }
        if (command.amount() <= 0) {
            throw new BadRequestException("amount must be a positive integer (cents)");
        }
        if (intervalDays <= 0) {
            throw new BadRequestException("intervalDays must be a positive integer (days)");
        }

        // 1. Gera a cobranca no gateway (fora de transacao: chamada de rede).
        GatewayChargeResult charge = paymentGateway.createCharge(
                new CreateGatewayChargeInput(
                        command.source(),
                        command.amount(),
                        command.source() + ":" + command.externalId()));

        // 2. Registra a cobranca PENDING. O vencimento do cliente so muda na
        // confirmacao (webhook).
        SubscriptionPaymentModel model = new SubscriptionPaymentModel();
        model.setSource(command.source());
        model.setExternalId(command.externalId());
        model.setAmount(command.amount());
        model.setIntervalDays(intervalDays);
        model.setGatewayChargeId(charge.gatewayChargeId());
        model.setStatus(SubscriptionPaymentStatusEnum.PENDING);
        model.setPaidPeriodEnd(null);

        SubscriptionPaymentModel payment = paymentRepository.create(model, null);

        log.info("[CreateSubscriptionCharge] pending paymentId={} gatewayChargeId={}",
                payment.getId(), charge.gatewayChargeId());

        return new CreateSubscriptionChargeResult(payment, charge);
    }
}
