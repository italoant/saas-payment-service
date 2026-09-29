import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CreateGatewayChargeInput,
  GatewayChargeResult,
  PaymentGatewayPort,
} from '@domain/deposit/ports/payment-gateway.port';

/**
 * Adapter stub do gateway de pagamento.
 *
 * Implementação temporária enquanto o gateway real não é definido. Gera um
 * QR Code (PIX) sintético e determinístico o suficiente para desenvolvimento
 * e testes de ponta a ponta do fluxo de depósito.
 *
 * Para integrar o gateway real, crie um novo adapter que implemente
 * `PaymentGatewayPort` (ex.: chamando a API HTTP do provedor) e troque o
 * `useClass` do provider PAYMENT_GATEWAY no módulo — nenhuma outra camada
 * precisa mudar.
 */
@Injectable()
export class StubPaymentGatewayAdapter implements PaymentGatewayPort {
  private readonly logger = new Logger(StubPaymentGatewayAdapter.name);

  async createCharge(
    input: CreateGatewayChargeInput,
  ): Promise<GatewayChargeResult> {
    const gatewayChargeId = `stub_${randomUUID()}`;

    // Payload PIX sintético (NÃO é um BR Code válido — apenas placeholder).
    const qrCodePayload = [
      '00020126',
      `stub-charge:${gatewayChargeId}`,
      `source:${input.source}`,
      `amount:${input.amount}`,
      input.externalReference ? `ref:${input.externalReference}` : 'ref:-',
    ].join('|');

    // Expira em 30 minutos, imitando o comportamento típico de cobranças PIX.
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    this.logger.warn(
      `[StubGateway] cobrança FALSA gerada id=${gatewayChargeId} amount=${input.amount}. ` +
        'Substitua por um gateway real antes de produção.',
    );

    return {
      gatewayChargeId,
      qrCodePayload,
      // Sem imagem: o stub retorna apenas o payload copia-e-cola.
      expiresAt,
    };
  }
}
