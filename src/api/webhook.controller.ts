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
import { ProcessDepositWebhookUseCase } from '@domain/deposit/use-cases/process-deposit-webhook.use-case';
import { DepositWebhookDto } from './dtos/deposit-webhook.dto';

/**
 * Recebe webhooks de depósito dos SaaS integrados.
 *
 * A rota é parametrizada por `:source` para que qualquer SaaS aponte para o
 * mesmo endpoint identificando-se pela URL (ex.: POST /webhook/saas-a).
 */
@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly processDepositWebhook: ProcessDepositWebhookUseCase,
  ) {}

  @Post(':source')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recebe um depósito de um SaaS de origem' })
  @ApiParam({
    name: 'source',
    example: 'saas-a',
    description: 'Identificador do SaaS que envia o webhook.',
  })
  async handle(
    @Param('source') source: string,
    @Body() body: DepositWebhookDto,
  ) {
    this.logger.log(
      `[Webhook] source=${source} body=${JSON.stringify(body)}`,
    );

    const transaction = await this.processDepositWebhook.execute({
      source,
      amount: body.amount,
      externalReference: body.externalReference,
      rawPayload: body as unknown as Record<string, unknown>,
    });

    return {
      transactionId: transaction.id,
      previousBalance: transaction.previousBalance,
      newBalance: transaction.newBalance,
      status: transaction.status,
    };
  }
}
