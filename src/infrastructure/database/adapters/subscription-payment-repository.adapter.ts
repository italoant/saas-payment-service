import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPaymentRepositoryPort } from '@domain/subscription/ports/subscription-payment-repository.port';
import { SubscriptionPaymentModel } from '@domain/subscription/models/subscription-payment.model';
import { SubscriptionPaymentStatusEnum } from '@domain/shared/enums/subscription-payment-status.enum';
import { TransactionContext } from '@domain/shared/ports/transaction-manager.port';
import { SubscriptionPaymentEntity } from '../entities/subscription-payment.entity';
import { resolveRepository } from './resolve-repository';

@Injectable()
export class SubscriptionPaymentRepositoryAdapter
  implements SubscriptionPaymentRepositoryPort
{
  constructor(
    @InjectRepository(SubscriptionPaymentEntity)
    private readonly repository: Repository<SubscriptionPaymentEntity>,
  ) {}

  async create(
    data: SubscriptionPaymentModel,
    ctx?: TransactionContext,
  ): Promise<SubscriptionPaymentModel> {
    const repo = resolveRepository(
      this.repository,
      SubscriptionPaymentEntity,
      ctx,
    );
    const created = repo.create({
      subscriptionId: data.subscriptionId,
      source: data.source,
      amount: data.amount,
      gatewayChargeId: data.gatewayChargeId,
      status: data.status,
      periodEnd: data.periodEnd ?? null,
    });
    const saved = await repo.save(created);
    return this.toModel(saved);
  }

  async findByGatewayChargeId(
    gatewayChargeId: string,
    ctx?: TransactionContext,
  ): Promise<SubscriptionPaymentModel | null> {
    const repo = resolveRepository(
      this.repository,
      SubscriptionPaymentEntity,
      ctx,
    );
    const found = await repo.findOne({ where: { gatewayChargeId } });
    return found ? this.toModel(found) : null;
  }

  async updateSettlement(
    id: number,
    data: {
      status: SubscriptionPaymentStatusEnum;
      periodEnd: Date | null;
    },
    ctx?: TransactionContext,
  ): Promise<SubscriptionPaymentModel> {
    const repo = resolveRepository(
      this.repository,
      SubscriptionPaymentEntity,
      ctx,
    );
    await repo.update(
      { id },
      { status: data.status, periodEnd: data.periodEnd },
    );
    const updated = await repo.findOneOrFail({ where: { id } });
    return this.toModel(updated);
  }

  private toModel(
    entity: SubscriptionPaymentEntity,
  ): SubscriptionPaymentModel {
    return new SubscriptionPaymentModel({
      id: entity.id,
      subscriptionId: entity.subscriptionId,
      source: entity.source,
      amount: Number(entity.amount),
      gatewayChargeId: entity.gatewayChargeId,
      status: entity.status,
      periodEnd: entity.periodEnd ? new Date(entity.periodEnd) : null,
      createdAt: entity.createdAt,
    });
  }
}
