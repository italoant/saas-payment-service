import { Global, Module } from '@nestjs/common';
import { PAYMENT_GATEWAY } from '@domain/shared/ports/tokens';
import { StubPaymentGatewayAdapter } from './stub-payment-gateway.adapter';

/**
 * Módulo de infraestrutura do gateway de pagamento.
 *
 * Único lugar que conhece o gateway concreto e o associa ao port
 * PAYMENT_GATEWAY do domínio. Para trocar o provedor, altere apenas o
 * `useClass` abaixo — o restante da aplicação injeta pelo token e não sabe
 * qual gateway está por trás.
 */
@Global()
@Module({
  providers: [
    { provide: PAYMENT_GATEWAY, useClass: StubPaymentGatewayAdapter },
  ],
  exports: [PAYMENT_GATEWAY],
})
export class GatewayModule {}
