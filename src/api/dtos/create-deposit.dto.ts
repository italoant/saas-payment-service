import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

/**
 * Corpo do request para criar um depósito.
 *
 * O cliente informa o valor (e opcionalmente uma referência de idempotência)
 * e o serviço gera, junto ao gateway, o QR Code para pagamento.
 */
export class CreateDepositDto {
  @ApiProperty({
    example: 10050,
    description: 'Valor a depositar, em centavos (inteiro positivo).',
  })
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiProperty({
    required: false,
    example: 'tx_abc123',
    description:
      'Referência da transação no sistema de origem. Usada para ' +
      'idempotência: o mesmo depósito não gera duas cobranças.',
  })
  @IsOptional()
  @IsString()
  externalReference?: string;
}
