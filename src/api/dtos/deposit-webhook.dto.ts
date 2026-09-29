import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

/**
 * Corpo do webhook de depósito enviado por um SaaS.
 *
 * Genérico de propósito: o valor e a referência são campos de topo, e o
 * `metadata` guarda qualquer coisa específica do SaaS. O payload inteiro é
 * gravado no log — inclusive campos não mapeados aqui.
 */
export class DepositWebhookDto {
  @ApiProperty({
    example: 10050,
    description: 'Valor a creditar, em centavos (inteiro positivo).',
  })
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiProperty({
    required: false,
    example: 'tx_abc123',
    description:
      'Referência da transação no sistema de origem. Usada para ' +
      'idempotência: o mesmo valor não é creditado duas vezes.',
  })
  @IsOptional()
  @IsString()
  externalReference?: string;

  @ApiProperty({
    required: false,
    type: Object,
    description: 'Dados adicionais específicos do SaaS (gravados no log).',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
