import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DEPOSIT_WEBHOOK_LOG_REPOSITORY,
  TRANSACTION_MANAGER,
  WALLET_REPOSITORY,
  WALLET_TRANSACTION_REPOSITORY,
} from '@domain/shared/ports/tokens';
import { TransactionManagerPort } from '@domain/shared/ports/transaction-manager.port';
import { WalletRepositoryPort } from '@domain/wallet/ports/wallet-repository.port';
import { WalletTransactionRepositoryPort } from '@domain/wallet/ports/wallet-transaction-repository.port';
import { DepositWebhookLogRepositoryPort } from '@domain/deposit/ports/deposit-webhook-log-repository.port';
import { WalletTransactionHistoryModel } from '@domain/wallet/models/wallet-transaction-history.model';
import { DepositWebhookLogModel } from '@domain/deposit/models/deposit-webhook-log.model';
import { TransactionStatusEnum } from '@domain/shared/enums/transaction-status.enum';
import { ProcessDepositWebhookCommand } from './process-deposit-webhook.command';

/**
 * Orquestra o recebimento de um depósito vindo de um SaaS:
 *
 *   1. grava o log do webhook (sempre, para auditoria);
 *   2. numa transação atômica: lê o saldo atual, cria a entrada no histórico
 *      (saldo anterior -> saldo novo) e atualiza o saldo da wallet;
 *   3. vincula o log à transação criada.
 *
 * Depende apenas de ports — não conhece TypeORM nem o banco concreto.
 */
@Injectable()
export class ProcessDepositWebhookUseCase {
  private readonly logger = new Logger(ProcessDepositWebhookUseCase.name);

  constructor(
    @Inject(TRANSACTION_MANAGER)
    private readonly transactionManager: TransactionManagerPort,
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: WalletRepositoryPort,
    @Inject(WALLET_TRANSACTION_REPOSITORY)
    private readonly transactionRepository: WalletTransactionRepositoryPort,
    @Inject(DEPOSIT_WEBHOOK_LOG_REPOSITORY)
    private readonly webhookLogRepository: DepositWebhookLogRepositoryPort,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    command: ProcessDepositWebhookCommand,
  ): Promise<WalletTransactionHistoryModel> {
    this.logger.log(
      `[DepositWebhook] source=${command.source} amount=${command.amount} ref=${command.externalReference ?? '-'}`,
    );

    if (!Number.isInteger(command.amount) || command.amount <= 0) {
      throw new BadRequestException(
        'amount must be a positive integer (cents)',
      );
    }

    // 1. Log sempre gravado, mesmo que a transação falhe depois. Fica fora da
    // transação de saldo para não ser revertido junto — é trilha de auditoria.
    const log = await this.webhookLogRepository.create(
      new DepositWebhookLogModel({
        source: command.source,
        payload: command.rawPayload,
      }),
    );

    // 2. Idempotência: se já processamos esta referência, não credita de novo.
    if (command.externalReference) {
      const existing = await this.transactionRepository.findByExternalReference(
        command.source,
        command.externalReference,
      );
      if (existing) {
        this.logger.warn(
          `[DepositWebhook] Duplicated event ignored source=${command.source} ref=${command.externalReference}`,
        );
        await this.webhookLogRepository.linkToTransaction(log.id, existing.id);
        return existing;
      }
    }

    const defaultCurrency = this.configService.get<string>(
      'wallet.defaultCurrency',
    );

    // 3. Transação atômica: saldo e histórico sobem juntos ou nada sobe.
    const transaction = await this.transactionManager.runInTransaction(
      async (ctx) => {
        const wallet = await this.walletRepository.getOrCreate(
          defaultCurrency,
          ctx,
        );

        const previousBalance = wallet.balance;
        const newBalance = previousBalance + command.amount;

        const created = await this.transactionRepository.create(
          new WalletTransactionHistoryModel({
            walletId: wallet.walletId,
            source: command.source,
            amount: command.amount,
            previousBalance,
            newBalance,
            externalReference: command.externalReference,
            status: TransactionStatusEnum.COMPLETED,
          }),
          ctx,
        );

        await this.walletRepository.updateBalance(
          wallet.walletId,
          newBalance,
          ctx,
        );

        return created;
      },
    );

    // 4. Vincula o log à transação criada (fora da transação de saldo; se
    // falhar aqui, o crédito já está consistente e o log continua gravado).
    await this.webhookLogRepository.linkToTransaction(log.id, transaction.id);

    this.logger.log(
      `[DepositWebhook] settled source=${command.source} txId=${transaction.id} previous=${transaction.previousBalance} new=${transaction.newBalance}`,
    );

    return transaction;
  }
}
