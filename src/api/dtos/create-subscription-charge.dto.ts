import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsString, MaxLength } from 'class-validator';

/**
 * Corpo do request para criar uma cobrança de assinatura.
 *
 * A rota é parametrizada por `:source` (o SaaS). O corpo informa o cliente
 * (externalId) e o plano; o serviço gera o QR Code para pagamento.
 */
export class CreateSubscriptionChargeDto {
  @ApiProperty({
    example: 'cli-123',
    description: 'Identificador do cliente/assinatura no sistema de origem.',
  })
  @IsString()
  @MaxLength(255)
  externalId: string;

  @ApiProperty({ example: 1, description: 'Id do plano a cobrar.' })
  @IsInt()
  @IsPositive()
  planId: number;
}
