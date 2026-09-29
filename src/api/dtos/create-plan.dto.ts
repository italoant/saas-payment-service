import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

/** Corpo do request para registrar um plano de assinatura. */
export class CreatePlanDto {
  @ApiProperty({ example: 'Mensal', description: 'Nome do plano.' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ required: false, example: 'Acesso completo, cobrado a cada 30 dias.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({
    example: 4990,
    description: 'Valor recorrente do plano, em centavos (inteiro positivo).',
  })
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiProperty({ required: false, example: 'BRL', description: 'Moeda ISO 4217.' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiProperty({
    example: 30,
    description: 'Intervalo de renovação em dias (ex.: 30 = mensal).',
  })
  @IsInt()
  @IsPositive()
  intervalDays: number;
}
