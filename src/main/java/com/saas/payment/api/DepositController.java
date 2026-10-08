package com.saas.payment.api;

import com.saas.payment.api.dtos.CreateDepositDto;
import com.saas.payment.domain.deposit.ports.PaymentGatewayPort.GatewayChargeResult;
import com.saas.payment.domain.deposit.usecases.CreateDepositCommand;
import com.saas.payment.domain.deposit.usecases.CreateDepositUseCase;
import com.saas.payment.domain.deposit.usecases.CreateDepositUseCase.CreateDepositResult;
import com.saas.payment.domain.wallet.models.WalletTransactionHistoryModel;
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
 * Cria depositos para os SaaS integrados.
 *
 * <p>A rota e parametrizada por {@code :source} (mesmo padrao do webhook), para
 * que cada SaaS se identifique pela URL (ex.: POST /deposits/saas-a).
 */
@Tag(name = "Deposits")
@RestController
@RequestMapping("/deposits")
public class DepositController {

    private static final Logger log = LoggerFactory.getLogger(DepositController.class);

    private final CreateDepositUseCase createDeposit;

    public DepositController(CreateDepositUseCase createDeposit) {
        this.createDeposit = createDeposit;
    }

    @PostMapping("/{source}")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cria um deposito e retorna o QR Code gerado pelo gateway")
    public Map<String, Object> handle(
            @Parameter(example = "saas-a", description = "Identificador do SaaS que solicita o deposito.")
            @PathVariable("source") String source,
            @Valid @RequestBody CreateDepositDto body) {
        log.info("[Deposit] source={} amount={} ref={}", source, body.getAmount(), body.getExternalReference());

        CreateDepositResult result = createDeposit.execute(
                new CreateDepositCommand(source, body.getAmount(), body.getExternalReference()));

        WalletTransactionHistoryModel transaction = result.transaction();
        GatewayChargeResult charge = result.charge();

        Map<String, Object> qrCode = new LinkedHashMap<>();
        qrCode.put("payload", charge.qrCodePayload());
        qrCode.put("image", charge.qrCodeImage());
        qrCode.put("expiresAt", charge.expiresAt());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("transactionId", transaction.getId());
        response.put("status", transaction.getStatus().getValue());
        response.put("amount", transaction.getAmount());
        response.put("gatewayChargeId", charge.gatewayChargeId());
        response.put("qrCode", qrCode);
        return response;
    }
}
