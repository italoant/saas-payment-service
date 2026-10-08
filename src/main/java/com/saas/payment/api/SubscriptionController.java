package com.saas.payment.api;

import com.saas.payment.api.dtos.CreateSubscriptionChargeDto;
import com.saas.payment.domain.deposit.ports.PaymentGatewayPort.GatewayChargeResult;
import com.saas.payment.domain.subscription.models.SubscriptionPaymentModel;
import com.saas.payment.domain.subscription.usecases.CreateSubscriptionChargeCommand;
import com.saas.payment.domain.subscription.usecases.CreateSubscriptionChargeUseCase;
import com.saas.payment.domain.subscription.usecases.CreateSubscriptionChargeUseCase.CreateSubscriptionChargeResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Cria cobrancas de assinatura para os clientes de um SaaS.
 *
 * <p>A rota e parametrizada por {@code :source} (o saasId). O fluxo: o front
 * cadastra um cliente pagante -> chama esta rota com o customer.id (externalId),
 * valor e intervalo -> o servico gera o QR Code e registra a cobranca PENDING
 * -> quando o pagamento e confirmado, o webhook prorroga o cliente diretamente
 * na tabela {@code customers}.
 */
@Tag(name = "Subscriptions")
@RestController
@RequestMapping("/subscriptions")
public class SubscriptionController {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionController.class);

    private final CreateSubscriptionChargeUseCase createCharge;

    public SubscriptionController(CreateSubscriptionChargeUseCase createCharge) {
        this.createCharge = createCharge;
    }

    @PostMapping("/{source}/charges")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cria uma cobranca de assinatura para um cliente e retorna o QR Code")
    public Map<String, Object> createChargeHandler(
            @Parameter(example = "saas-a", description = "Identificador do SaaS (saasId).")
            @PathVariable("source") String source,
            @Valid @RequestBody CreateSubscriptionChargeDto body) {
        log.info("[Subscription] charge source={} externalId={} amount={} intervalDays={}",
                source, body.getExternalId(), body.getAmount(), body.getIntervalDays());

        CreateSubscriptionChargeResult result = createCharge.execute(
                new CreateSubscriptionChargeCommand(source, body.getExternalId(),
                        body.getAmount(), body.getIntervalDays()));

        SubscriptionPaymentModel payment = result.payment();
        GatewayChargeResult charge = result.charge();

        Map<String, Object> qrCode = new LinkedHashMap<>();
        qrCode.put("payload", charge.qrCodePayload());
        qrCode.put("image", charge.qrCodeImage());
        qrCode.put("expiresAt", charge.expiresAt());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("paymentId", payment.getId());
        response.put("externalId", payment.getExternalId());
        response.put("amount", payment.getAmount());
        response.put("intervalDays", payment.getIntervalDays());
        response.put("status", payment.getStatus().getValue());
        response.put("gatewayChargeId", charge.gatewayChargeId());
        response.put("qrCode", qrCode);
        return response;
    }
}
