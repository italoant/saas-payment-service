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
      source: data.source,
      externalId: data.externalId,
      amount: data.amount,
      intervalDays: data.intervalDays,
      gatewayChargeId: data.gatewayChargeId,
      status: data.status,
      paidPeriodEnd: data.paidPeriodEnd ?? null,
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
      paidPeriodEnd: Date | null;
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
      { status: data.status, paidPeriodEnd: data.paidPeriodEnd },
    );
    const updated = await repo.findOneOrFail({ where: { id } });
    return this.toModel(updated);
  }

  private toModel(entity: SubscriptionPaymentEntity): SubscriptionPaymentModel {
    return new SubscriptionPaymentModel({
      id: entity.id,
      source: entity.source,
      externalId: entity.externalId,
      amount: Number(entity.amount),
      intervalDays: entity.intervalDays,
      gatewayChargeId: entity.gatewayChargeId,
      status: entity.status,
      paidPeriodEnd: entity.paidPeriodEnd
        ? new Date(entity.paidPeriodEnd)
        : null,
      createdAt: entity.createdAt,
    });
  }
}
