import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepositWebhookLogRepositoryPort } from '@domain/deposit/ports/deposit-webhook-log-repository.port';
import { DepositWebhookLogModel } from '@domain/deposit/models/deposit-webhook-log.model';
import { TransactionContext } from '@domain/shared/ports/transaction-manager.port';
import { DepositWebhookLogEntity } from '../entities/deposit-webhook-log.entity';
import { resolveRepository } from './resolve-repository';

@Injectable()
export class DepositWebhookLogRepositoryAdapter
  implements DepositWebhookLogRepositoryPort
{
  constructor(
    @InjectRepository(DepositWebhookLogEntity)
    private readonly repository: Repository<DepositWebhookLogEntity>,
  ) {}

  async create(
    data: DepositWebhookLogModel,
    ctx?: TransactionContext,
  ): Promise<DepositWebhookLogModel> {
    const repo = resolveRepository(
      this.repository,
      DepositWebhookLogEntity,
      ctx,
    );
    const created = repo.create({
      source: data.source,
      payload: data.payload,
      walletTransactionId: data.walletTransactionId ?? null,
    });
    const saved = await repo.save(created);
    return this.toModel(saved);
  }

  async linkToTransaction(
    logId: number,
    walletTransactionId: number,
    ctx?: TransactionContext,
  ): Promise<void> {
    const repo = resolveRepository(
      this.repository,
      DepositWebhookLogEntity,
      ctx,
    );
    await repo.update({ id: logId }, { walletTransactionId });
  }

  private toModel(entity: DepositWebhookLogEntity): DepositWebhookLogModel {
    return new DepositWebhookLogModel({
      id: entity.id,
      source: entity.source,
      payload: entity.payload,
      walletTransactionId: entity.walletTransactionId,
      createdAt: entity.createdAt,
    });
  }
}
