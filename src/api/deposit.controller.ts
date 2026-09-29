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
import { CreateDepositUseCase } from '@domain/deposit/use-cases/create-deposit.use-case';
import { CreateDepositDto } from './dtos/create-deposit.dto';

/**
 * Cria depósitos para os SaaS integrados.
 *
 * A rota é parametrizada por `:source` (mesmo padrão do webhook), para que
 * cada SaaS se identifique pela URL (ex.: POST /deposits/saas-a).
 *
 * O fluxo é: o cliente pede um depósito -> o serviço gera a cobrança (QR Code)
 * no gateway e registra a transação como PENDING -> quando o pagamento é
 * confirmado, o gateway chama o webhook, que credita o saldo.
 */
@ApiTags('Deposits')
@Controller('deposits')
export class DepositController {
  private readonly logger = new Logger(DepositController.name);

  constructor(private readonly createDeposit: CreateDepositUseCase) {}

  @Post(':source')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cria um depósito e retorna o QR Code gerado pelo gateway',
  })
  @ApiParam({
    name: 'source',
    example: 'saas-a',
    description: 'Identificador do SaaS que solicita o depósito.',
  })
  async handle(
    @Param('source') source: string,
    @Body() body: CreateDepositDto,
  ) {
    this.logger.log(`[Deposit] source=${source} body=${JSON.stringify(body)}`);

    const { transaction, charge } = await this.createDeposit.execute({
      source,
      amount: body.amount,
      externalReference: body.externalReference,
    });

    return {
      transactionId: transaction.id,
      status: transaction.status,
      amount: transaction.amount,
      gatewayChargeId: charge.gatewayChargeId,
      qrCode: {
        payload: charge.qrCodePayload,
        image: charge.qrCodeImage,
        expiresAt: charge.expiresAt,
      },
    };
  }
}
