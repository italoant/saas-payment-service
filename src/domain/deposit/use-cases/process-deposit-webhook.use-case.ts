import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
 * Valores de status que o gateway pode enviar para indicar que o pagamento
 * foi confirmado. Como o gateway ainda não foi definido, tratamos os mais
 * comuns; quando `status` não vier, assumimos confirmação (o webhook só é
 * chamado em eventos de pagamento).
 */
const PAID_STATUSES = new Set([
  'paid',
  'approved',
  'confirmed',
  'completed',
  'success',
  'succeeded',
]);

/**
 * Confirma um depósito a partir do webhook do gateway.
 *
 * O gateway informa apenas o id da cobrança. O fluxo é:
 *
 *   1. grava o log do webhook (auditoria, sempre);
 *   2. localiza a transação PENDING pelo gatewayChargeId — é assim que
 *      descobrimos o `source` e os dados do depósito;
 *   3. se o status recebido não for de pagamento confirmado, não credita;
 *   4. idempotência: se a transação já está COMPLETED, não credita de novo;
 *   5. numa transação atômica: aplica o crédito ao saldo da wallet e move a
 *      transação de PENDING para COMPLETED.
 *
 * Depende apenas de ports — não conhece TypeORM nem o gateway concreto.
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
      `[DepositWebhook] gatewayChargeId=${command.gatewayChargeId} status=${command.status ?? '-'}`,
    );

    // 1. Localiza a transação pendente pela cobrança. É daqui que sai o
    // `source` — o gateway não o envia.
    const transaction = await this.transactionRepository.findByGatewayChargeId(
      command.gatewayChargeId,
    );

    // 2. Log de auditoria, sempre gravado. Fica fora da transação de saldo
    // para não ser revertido junto. `source` vem da transação (ou '-' se não
    // encontrada, para um id desconhecido).
    const log = await this.webhookLogRepository.create(
      new DepositWebhookLogModel({
        source: transaction?.source ?? '-',
        payload: command.rawPayload,
      }),
    );

    if (!transaction) {
      this.logger.warn(
        `[DepositWebhook] Nenhuma transação para gatewayChargeId=${command.gatewayChargeId}`,
      );
      throw new NotFoundException(
        `No deposit found for gatewayChargeId=${command.gatewayChargeId}`,
      );
    }

    // 3. Se o gateway informou status e ele não é de confirmação, não credita.
    if (
      command.status &&
      !PAID_STATUSES.has(command.status.trim().toLowerCase())
    ) {
      this.logger.warn(
        `[DepositWebhook] status não confirmado (${command.status}) para txId=${transaction.id}; ignorando crédito`,
      );
      await this.webhookLogRepository.linkToTransaction(log.id, transaction.id);
      return transaction;
    }

    // 4. Idempotência: se já foi creditado, não credita de novo.
    if (transaction.status === TransactionStatusEnum.COMPLETED) {
      this.logger.warn(
        `[DepositWebhook] Evento duplicado ignorado txId=${transaction.id}`,
      );
      await this.webhookLogRepository.linkToTransaction(log.id, transaction.id);
      return transaction;
    }

    const defaultCurrency = this.configService.get<string>(
      'wallet.defaultCurrency',
    );

    // 5. Transação atômica: crédito no saldo e mudança de status sobem juntos.
    const settled = await this.transactionManager.runInTransaction(
      async (ctx) => {
        const wallet = await this.walletRepository.getOrCreate(
          defaultCurrency,
          ctx,
        );

        const previousBalance = wallet.balance;
        const newBalance = previousBalance + transaction.amount;

        const updated = await this.transactionRepository.updateSettlement(
          transaction.id,
          {
            status: TransactionStatusEnum.COMPLETED,
            previousBalance,
            newBalance,
          },
          ctx,
        );

        await this.walletRepository.updateBalance(
          wallet.walletId,
          newBalance,
          ctx,
        );

        return updated;
      },
    );

    // 6. Vincula o log à transação (fora da transação de saldo).
    await this.webhookLogRepository.linkToTransaction(log.id, settled.id);

    this.logger.log(
      `[DepositWebhook] settled source=${settled.source} txId=${settled.id} previous=${settled.previousBalance} new=${settled.newBalance}`,
    );

    return settled;
  }
}
