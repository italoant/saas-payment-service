package com.saas.payment.api;

import com.saas.payment.api.dtos.DepositWebhookDto;
import com.saas.payment.domain.subscription.usecases.ProcessSubscriptionWebhookCommand;
import com.saas.payment.domain.subscription.usecases.ProcessSubscriptionWebhookUseCase;
import com.saas.payment.domain.subscription.usecases.ProcessSubscriptionWebhookUseCase.ProcessSubscriptionWebhookResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Recebe o webhook de confirmacao de pagamento de assinatura do gateway.
 *
 * <p>O gateway envia apenas o id da cobranca (mais, opcionalmente, um status).
 * O servico localiza a cobranca pendente por esse id, confirma o pagamento e
 * prorroga o vencimento da assinatura pelo intervalo do plano.
 */
@Tag(name = "Webhook")
@RestController
@RequestMapping("/webhook/subscription")
public class SubscriptionWebhookController {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionWebhookController.class);

    private final ProcessSubscriptionWebhookUseCase processSubscriptionWebhook;

    public SubscriptionWebhookController(ProcessSubscriptionWebhookUseCase processSubscriptionWebhook) {
        this.processSubscriptionWebhook = processSubscriptionWebhook;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.OK)
    @Operation(summary =
            "Confirma o pagamento de uma assinatura pelo id da cobranca e prorroga o vencimento")
    public Map<String, Object> handle(@Valid @RequestBody DepositWebhookDto body) {
        log.info("[SubscriptionWebhook] id={} status={}", body.getId(), body.getStatus());

        Map<String, Object> rawPayload = new LinkedHashMap<>();
        rawPayload.put("id", body.getId());
        rawPayload.put("status", body.getStatus());

        ProcessSubscriptionWebhookResult result = processSubscriptionWebhook.execute(
                new ProcessSubscriptionWebhookCommand(body.getId(), body.getStatus(), rawPayload));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("paymentId", result.paymentId());
        response.put("status", result.status().getValue());
        response.put("customerId", result.customerId());
        response.put("newDueDate", result.newDueDate());
        return response;
    }
}
