package com.saas.payment.infrastructure.gateway;

import com.saas.payment.domain.deposit.ports.PaymentGatewayPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Adapter stub do gateway de pagamento.
 *
 * <p>Implementacao temporaria enquanto o gateway real nao e definido. Gera um
 * QR Code (PIX) sintetico e deterministico o suficiente para desenvolvimento e
 * testes de ponta a ponta do fluxo de deposito.
 *
 * <p>Para integrar o gateway real, crie um novo adapter que implemente
 * {@link PaymentGatewayPort} (ex.: chamando a API HTTP do provedor) e troque
 * o bean primario na configuracao — nenhuma outra camada precisa mudar.
 */
@Component
public class StubPaymentGatewayAdapter implements PaymentGatewayPort {

    private static final Logger log = LoggerFactory.getLogger(StubPaymentGatewayAdapter.class);

    @Override
    public GatewayChargeResult createCharge(CreateGatewayChargeInput input) {
        String gatewayChargeId = "stub_" + UUID.randomUUID();

        // Payload PIX sintetico (NAO e um BR Code valido — apenas placeholder).
        String ref = input.externalReference() != null
                ? "ref:" + input.externalReference()
                : "ref:-";
        String qrCodePayload = String.join("|",
                "00020126",
                "stub-charge:" + gatewayChargeId,
                "source:" + input.source(),
                "amount:" + input.amount(),
                ref);

        // Expira em 30 minutos, imitando o comportamento tipico de cobrancas PIX.
        Instant expiresAt = Instant.now().plus(Duration.ofMinutes(30));

        log.warn("[StubGateway] cobranca FALSA gerada id={} amount={}. "
                + "Substitua por um gateway real antes de producao.",
                gatewayChargeId, input.amount());

        // Sem imagem: o stub retorna apenas o payload copia-e-cola.
        return new GatewayChargeResult(gatewayChargeId, qrCodePayload, null, expiresAt);
    }
}
