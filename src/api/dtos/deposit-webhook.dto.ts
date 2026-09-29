import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Corpo do webhook de confirmação enviado pelo gateway.
 *
 * O gateway não conhece o `source` nem a referência do SaaS: ele informa
 * apenas o id da cobrança que geramos ao criar o depósito. O serviço usa esse
 * id para localizar a transação pendente e descobrir todo o resto.
 */
export class DepositWebhookDto {
  @ApiProperty({
    example: 'stub_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    description:
      'Id da cobrança no gateway (o gatewayChargeId retornado na criação ' +
      'do depósito). Chave de conciliação.',
  })
  @IsString()
  @MaxLength(255)
  id: string;

  @ApiProperty({
    required: false,
    example: 'paid',
    description:
      'Status informado pelo gateway. Opcional: qualquer valor diferente ' +
      'de um status de pagamento confirmado não credita o saldo.',
  })
  @IsOptional()
  @IsString()
  status?: string;
}
