import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProcessDepositWebhookUseCase } from '@domain/deposit/use-cases/process-deposit-webhook.use-case';
import { DepositWebhookDto } from './dtos/deposit-webhook.dto';

/**
 * Recebe o webhook de confirmação de pagamento do gateway.
 *
 * O gateway envia apenas o id da cobrança (mais, opcionalmente, um status).
 * Ele não conhece o `source` nem a referência do SaaS — o serviço descobre
 * tudo isso a partir da transação pendente associada a esse id.
 */
@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly processDepositWebhook: ProcessDepositWebhookUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirma um depósito a partir do id da cobrança do gateway',
  })
  async handle(@Body() body: DepositWebhookDto) {
    this.logger.log(`[Webhook] body=${JSON.stringify(body)}`);

    const transaction = await this.processDepositWebhook.execute({
      gatewayChargeId: body.id,
      status: body.status,
      rawPayload: body as unknown as Record<string, unknown>,
    });

    return {
      transactionId: transaction.id,
      source: transaction.source,
      previousBalance: transaction.previousBalance,
      newBalance: transaction.newBalance,
      status: transaction.status,
    };
  }
}
