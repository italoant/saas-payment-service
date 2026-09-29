import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PAYMENT_GATEWAY,
  TRANSACTION_MANAGER,
  WALLET_REPOSITORY,
  WALLET_TRANSACTION_REPOSITORY,
} from '@domain/shared/ports/tokens';
import { TransactionManagerPort } from '@domain/shared/ports/transaction-manager.port';
import { WalletRepositoryPort } from '@domain/wallet/ports/wallet-repository.port';
import { WalletTransactionRepositoryPort } from '@domain/wallet/ports/wallet-transaction-repository.port';
import { WalletTransactionHistoryModel } from '@domain/wallet/models/wallet-transaction-history.model';
import { TransactionStatusEnum } from '@domain/shared/enums/transaction-status.enum';
import {
  GatewayChargeResult,
  PaymentGatewayPort,
} from '@domain/deposit/ports/payment-gateway.port';
import { CreateDepositCommand } from './create-deposit.command';

/**
 * Resultado da criação de um depósito: a transação registrada (ainda
 * PENDING, aguardando confirmação via webhook) e os dados do QR Code que o
 * cliente usa para pagar.
 */
export interface CreateDepositResult {
  transaction: WalletTransactionHistoryModel;
  charge: GatewayChargeResult;
}

/**
 * Orquestra a criação de um depósito:
 *
 *   1. valida o valor;
 *   2. aplica idempotência por (source, externalReference) — se já existe
 *      um depósito para a referência, não cria outra cobrança;
 *   3. chama o gateway para gerar a cobrança (QR Code);
 *   4. registra a transação como PENDING (o saldo NÃO é creditado aqui — o
 *      crédito acontece quando o gateway confirmar o pagamento via webhook);
 *   5. retorna a transação e o QR Code.
 *
 * Depende apenas de ports — não conhece o gateway concreto nem o banco.
 */
@Injectable()
export class CreateDepositUseCase {
  private readonly logger = new Logger(CreateDepositUseCase.name);

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGatewayPort,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactionManager: TransactionManagerPort,
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: WalletRepositoryPort,
    @Inject(WALLET_TRANSACTION_REPOSITORY)
    private readonly transactionRepository: WalletTransactionRepositoryPort,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: CreateDepositCommand): Promise<CreateDepositResult> {
    this.logger.log(
      `[CreateDeposit] source=${command.source} amount=${command.amount} ref=${command.externalReference ?? '-'}`,
    );

    if (!Number.isInteger(command.amount) || command.amount <= 0) {
      throw new BadRequestException(
        'amount must be a positive integer (cents)',
      );
    }

    // 1. Idempotência: se já criamos um depósito para esta referência, chamar
    // de novo não deve gerar uma nova cobrança no gateway.
    if (command.externalReference) {
      const existing = await this.transactionRepository.findByExternalReference(
        command.source,
        command.externalReference,
      );
      if (existing) {
        throw new BadRequestException(
          `A deposit already exists for source=${command.source} ref=${command.externalReference}`,
        );
      }
    }

    // 2. Gera a cobrança no gateway (QR Code). Fora da transação de banco:
    // é uma chamada de rede a terceiro e não deve segurar a transação aberta.
    const charge = await this.paymentGateway.createCharge({
      source: command.source,
      amount: command.amount,
      externalReference: command.externalReference,
    });

    const defaultCurrency = this.configService.get<string>(
      'wallet.defaultCurrency',
    );

    // 3. Registra a transação como PENDING. O saldo só é aplicado quando o
    // gateway confirmar o pagamento (webhook). O id da cobrança é guardado em
    // coluna dedicada — é por ele que o webhook vai conciliar (o webhook não
    // conhece o `source` nem a referência do SaaS).
    const transaction = await this.transactionManager.runInTransaction(
      async (ctx) => {
        const wallet = await this.walletRepository.getOrCreate(
          defaultCurrency,
          ctx,
        );

        return this.transactionRepository.create(
          new WalletTransactionHistoryModel({
            walletId: wallet.walletId,
            source: command.source,
            amount: command.amount,
            previousBalance: wallet.balance,
            // Saldo ainda não muda: depósito pendente de confirmação.
            newBalance: wallet.balance,
            externalReference: command.externalReference,
            gatewayChargeId: charge.gatewayChargeId,
            status: TransactionStatusEnum.PENDING,
          }),
          ctx,
        );
      },
    );

    this.logger.log(
      `[CreateDeposit] pending txId=${transaction.id} gatewayChargeId=${charge.gatewayChargeId}`,
    );

    return { transaction, charge };
  }
}
