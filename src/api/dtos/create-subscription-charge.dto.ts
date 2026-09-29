import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

/**
 * Corpo do request para criar uma cobrança de assinatura.
 *
 * A rota é parametrizada por `:source` (o SaaS). O corpo identifica o cliente
 * do front (externalId = customer.id) e informa valor e intervalo (o front
 * define ao cadastrar; mensal = 30 dias).
 */
export class CreateSubscriptionChargeDto {
  @ApiProperty({
    example: 'cli-abc123',
    description: 'Id do cliente no front (customer.id).',
  })
  @IsString()
  @MaxLength(255)
  externalId: string;

  @ApiProperty({
    example: 4990,
    description: 'Valor a cobrar, em centavos (inteiro positivo).',
  })
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiProperty({
    required: false,
    example: 30,
    description: 'Intervalo de renovação em dias (default 30 = mensal).',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  intervalDays?: number;
}
