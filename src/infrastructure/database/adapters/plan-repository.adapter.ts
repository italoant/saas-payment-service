import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanRepositoryPort } from '@domain/subscription/ports/plan-repository.port';
import { PlanModel } from '@domain/subscription/models/plan.model';
import { TransactionContext } from '@domain/shared/ports/transaction-manager.port';
import { PlanEntity } from '../entities/plan.entity';
import { resolveRepository } from './resolve-repository';

@Injectable()
export class PlanRepositoryAdapter implements PlanRepositoryPort {
  constructor(
    @InjectRepository(PlanEntity)
    private readonly repository: Repository<PlanEntity>,
  ) {}

  async create(data: PlanModel, ctx?: TransactionContext): Promise<PlanModel> {
    const repo = resolveRepository(this.repository, PlanEntity, ctx);
    const created = repo.create({
      name: data.name,
      description: data.description ?? null,
      amount: data.amount,
      currency: data.currency,
      intervalDays: data.intervalDays,
      active: data.active ?? true,
    });
    const saved = await repo.save(created);
    return this.toModel(saved);
  }

  async findById(
    id: number,
    ctx?: TransactionContext,
  ): Promise<PlanModel | null> {
    const repo = resolveRepository(this.repository, PlanEntity, ctx);
    const found = await repo.findOne({ where: { id } });
    return found ? this.toModel(found) : null;
  }

  async findAll(ctx?: TransactionContext): Promise<PlanModel[]> {
    const repo = resolveRepository(this.repository, PlanEntity, ctx);
    const rows = await repo.find({ order: { id: 'ASC' } });
    return rows.map((r) => this.toModel(r));
  }

  private toModel(entity: PlanEntity): PlanModel {
    return new PlanModel({
      id: entity.id,
      name: entity.name,
      description: entity.description ?? undefined,
      amount: Number(entity.amount),
      currency: entity.currency,
      intervalDays: entity.intervalDays,
      active: entity.active,
      createdAt: entity.createdAt,
    });
  }
}
