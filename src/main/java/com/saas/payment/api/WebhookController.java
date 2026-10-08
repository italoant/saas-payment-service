package com.saas.payment.api;

import com.saas.payment.api.dtos.DepositWebhookDto;
import com.saas.payment.domain.deposit.usecases.ProcessDepositWebhookCommand;
import com.saas.payment.domain.deposit.usecases.ProcessDepositWebhookUseCase;
import com.saas.payment.domain.wallet.models.WalletTransactionHistoryModel;
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
 * Recebe o webhook de confirmacao de pagamento do gateway.
 *
 * <p>O gateway envia apenas o id da cobranca (mais, opcionalmente, um status).
 * Ele nao conhece o {@code source} nem a referencia do SaaS — o servico
 * descobre tudo isso a partir da transacao pendente associada a esse id.
 */
@Tag(name = "Webhook")
@RestController
@RequestMapping("/webhook")
public class WebhookController {

    private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

    private final ProcessDepositWebhookUseCase processDepositWebhook;

    public WebhookController(ProcessDepositWebhookUseCase processDepositWebhook) {
        this.processDepositWebhook = processDepositWebhook;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.OK)
    @Operation(summary = "Confirma um deposito a partir do id da cobranca do gateway")
    public Map<String, Object> handle(@Valid @RequestBody DepositWebhookDto body) {
        log.info("[Webhook] id={} status={}", body.getId(), body.getStatus());

        Map<String, Object> rawPayload = new LinkedHashMap<>();
        rawPayload.put("id", body.getId());
        rawPayload.put("status", body.getStatus());

        WalletTransactionHistoryModel transaction = processDepositWebhook.execute(
                new ProcessDepositWebhookCommand(body.getId(), body.getStatus(), rawPayload));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("transactionId", transaction.getId());
        response.put("source", transaction.getSource());
        response.put("previousBalance", transaction.getPreviousBalance());
        response.put("newBalance", transaction.getNewBalance());
        response.put("status", transaction.getStatus().getValue());
        return response;
    }
}
