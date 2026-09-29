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
 * Cria cobranças de assinatura para os clientes de um SaaS.
 *
 * A rota é parametrizada por `:source` (o saasId). O fluxo: o front cadastra
 * um cliente pagante -> chama esta rota com o customer.id (externalId), valor
 * e intervalo -> o serviço gera o QR Code e registra a cobrança PENDING ->
 * quando o pagamento é confirmado, o webhook prorroga o cliente (marca pago e
 * empurra o vencimento) diretamente na tabela `customers`.
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
      'Cria uma cobrança de assinatura para um cliente e retorna o QR Code',
  })
  @ApiParam({
    name: 'source',
    example: 'saas-a',
    description: 'Identificador do SaaS (saasId).',
  })
  async createChargeHandler(
    @Param('source') source: string,
    @Body() body: CreateSubscriptionChargeDto,
  ) {
    this.logger.log(
      `[Subscription] charge source=${source} body=${JSON.stringify(body)}`,
    );

    const { payment, charge } = await this.createCharge.execute({
      source,
      externalId: body.externalId,
      amount: body.amount,
      intervalDays: body.intervalDays,
    });

    return {
      paymentId: payment.id,
      externalId: payment.externalId,
      amount: payment.amount,
      intervalDays: payment.intervalDays,
      status: payment.status,
      gatewayChargeId: charge.gatewayChargeId,
      qrCode: {
        payload: charge.qrCodePayload,
        image: charge.qrCodeImage,
        expiresAt: charge.expiresAt,
      },
    };
  }
}
