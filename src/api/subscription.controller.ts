import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CreateSubscriptionChargeUseCase } from '@domain/subscription/use-cases/create-subscription-charge.use-case';
import { CreateSubscriptionChargeDto } from './dtos/create-subscription-charge.dto';

/**
 * Cria cobranças de assinatura para os SaaS integrados.
 *
 * A rota é parametrizada por `:source` (mesmo padrão de depósitos/webhook).
 * O fluxo é: o SaaS pede a cobrança de um cliente para um plano -> o serviço
 * garante a assinatura, gera o QR Code no gateway e registra a cobrança como
 * PENDING -> quando o pagamento é confirmado, o webhook prorroga a assinatura.
 */
@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(
    private readonly createCharge: CreateSubscriptionChargeUseCase,
  ) {}

  @Post(':source/charges')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Cria uma cobrança de assinatura e retorna o QR Code gerado pelo gateway',
  })
  @ApiParam({
    name: 'source',
    example: 'saas-a',
    description: 'Identificador do SaaS que solicita a cobrança.',
  })
  async createChargeHandler(
    @Param('source') source: string,
    @Body() body: CreateSubscriptionChargeDto,
  ) {
    this.logger.log(
      `[Subscription] charge source=${source} body=${JSON.stringify(body)}`,
    );

    const { subscription, payment, charge } = await this.createCharge.execute({
      source,
      externalId: body.externalId,
      planId: body.planId,
    });

    return {
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      paymentId: payment.id,
      amount: payment.amount,
      gatewayChargeId: charge.gatewayChargeId,
      qrCode: {
        payload: charge.qrCodePayload,
        image: charge.qrCodeImage,
        expiresAt: charge.expiresAt,
      },
    };
  }
}
