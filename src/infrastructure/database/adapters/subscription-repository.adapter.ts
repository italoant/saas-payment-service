import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionRepositoryPort } from '@domain/subscription/ports/subscription-repository.port';
import { SubscriptionModel } from '@domain/subscription/models/subscription.model';
import { SubscriptionStatusEnum } from '@domain/shared/enums/subscription-status.enum';
import { TransactionContext } from '@domain/shared/ports/transaction-manager.port';
import { SubscriptionEntity } from '../entities/subscription.entity';
import { resolveRepository } from './resolve-repository';

@Injectable()
export class SubscriptionRepositoryAdapter
  implements SubscriptionRepositoryPort
{
  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly repository: Repository<SubscriptionEntity>,
  ) {}

  async create(
    data: SubscriptionModel,
    ctx?: TransactionContext,
  ): Promise<SubscriptionModel> {
    const repo = resolveRepository(this.repository, SubscriptionEntity, ctx);
    const created = repo.create({
      source: data.source,
      externalId: data.externalId,
      planId: data.planId,
      status: data.status,
      currentPeriodEnd: data.currentPeriodEnd ?? null,
      extendedDays: data.extendedDays ?? 0,
    });
    const saved = await repo.save(created);
    return this.toModel(saved);
  }

  async findById(
    id: number,
    ctx?: TransactionContext,
  ): Promise<SubscriptionModel | null> {
    const repo = resolveRepository(this.repository, SubscriptionEntity, ctx);
    const found = await repo.findOne({ where: { id } });
    return found ? this.toModel(found) : null;
  }

  async findBySourceAndExternalId(
    source: string,
    externalId: string,
    ctx?: TransactionContext,
  ): Promise<SubscriptionModel | null> {
    const repo = resolveRepository(this.repository, SubscriptionEntity, ctx);
    const found = await repo.findOne({ where: { source, externalId } });
    return found ? this.toModel(found) : null;
  }

  async updatePeriod(
    id: number,
    data: {
      status: SubscriptionStatusEnum;
      currentPeriodEnd: Date;
      extendedDays: number;
    },
    ctx?: TransactionContext,
  ): Promise<SubscriptionModel> {
    const repo = resolveRepository(this.repository, SubscriptionEntity, ctx);
    await repo.update(
      { id },
      {
        status: data.status,
        currentPeriodEnd: data.currentPeriodEnd,
        extendedDays: data.extendedDays,
      },
    );
    const updated = await repo.findOneOrFail({ where: { id } });
    return this.toModel(updated);
  }

  private toModel(entity: SubscriptionEntity): SubscriptionModel {
    return new SubscriptionModel({
      id: entity.id,
      source: entity.source,
      externalId: entity.externalId,
      planId: entity.planId,
      status: entity.status,
      currentPeriodEnd: entity.currentPeriodEnd
        ? new Date(entity.currentPeriodEnd)
        : null,
      extendedDays: entity.extendedDays,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
