import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProcessSubscriptionWebhookUseCase } from '@domain/subscription/use-cases/process-subscription-webhook.use-case';
import { DepositWebhookDto } from './dtos/deposit-webhook.dto';

/**
 * Recebe o webhook de confirmação de pagamento de assinatura do gateway.
 *
 * O gateway envia apenas o id da cobrança (mais, opcionalmente, um status).
 * O serviço localiza a cobrança pendente por esse id, confirma o pagamento e
 * prorroga o vencimento da assinatura pelo intervalo do plano.
 */
@ApiTags('Webhook')
@Controller('webhook/subscription')
export class SubscriptionWebhookController {
  private readonly logger = new Logger(SubscriptionWebhookController.name);

  constructor(
    private readonly processSubscriptionWebhook: ProcessSubscriptionWebhookUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Confirma o pagamento de uma assinatura pelo id da cobrança e prorroga o vencimento',
  })
  async handle(@Body() body: DepositWebhookDto) {
    this.logger.log(`[SubscriptionWebhook] body=${JSON.stringify(body)}`);

    const subscription = await this.processSubscriptionWebhook.execute({
      gatewayChargeId: body.id,
      status: body.status,
      rawPayload: body as unknown as Record<string, unknown>,
    });

    return {
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  }
}
