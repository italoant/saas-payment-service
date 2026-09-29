import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletTransactionRepositoryPort } from '@domain/wallet/ports/wallet-transaction-repository.port';
import { WalletTransactionHistoryModel } from '@domain/wallet/models/wallet-transaction-history.model';
import { TransactionContext } from '@domain/shared/ports/transaction-manager.port';
import { TransactionStatusEnum } from '@domain/shared/enums/transaction-status.enum';
import { WalletTransactionHistoryEntity } from '../entities/wallet-transaction-history.entity';
import { resolveRepository } from './resolve-repository';

@Injectable()
export class WalletTransactionRepositoryAdapter implements WalletTransactionRepositoryPort {
  constructor(
    @InjectRepository(WalletTransactionHistoryEntity)
    private readonly repository: Repository<WalletTransactionHistoryEntity>,
  ) {}

  async create(
    data: WalletTransactionHistoryModel,
    ctx?: TransactionContext,
  ): Promise<WalletTransactionHistoryModel> {
    const repo = resolveRepository(
      this.repository,
      WalletTransactionHistoryEntity,
      ctx,
    );
    const created = repo.create({
      walletId: data.walletId,
      source: data.source,
      amount: data.amount,
      previousBalance: data.previousBalance,
      newBalance: data.newBalance,
      externalReference: data.externalReference ?? null,
      gatewayChargeId: data.gatewayChargeId ?? null,
      status: data.status,
    });
    const saved = await repo.save(created);
    return this.toModel(saved);
  }

  async findByExternalReference(
    source: string,
    externalReference: string,
    ctx?: TransactionContext,
  ): Promise<WalletTransactionHistoryModel | null> {
    const repo = resolveRepository(
      this.repository,
      WalletTransactionHistoryEntity,
      ctx,
    );
    const found = await repo.findOne({
      where: { source, externalReference },
    });
    return found ? this.toModel(found) : null;
  }

  async findByGatewayChargeId(
    gatewayChargeId: string,
    ctx?: TransactionContext,
  ): Promise<WalletTransactionHistoryModel | null> {
    const repo = resolveRepository(
      this.repository,
      WalletTransactionHistoryEntity,
      ctx,
    );
    const found = await repo.findOne({
      where: { gatewayChargeId },
    });
    return found ? this.toModel(found) : null;
  }

  async updateSettlement(
    id: number,
    data: {
      status: TransactionStatusEnum;
      previousBalance: number;
      newBalance: number;
    },
    ctx?: TransactionContext,
  ): Promise<WalletTransactionHistoryModel> {
    const repo = resolveRepository(
      this.repository,
      WalletTransactionHistoryEntity,
      ctx,
    );
    await repo.update(
      { id },
      {
        status: data.status,
        previousBalance: data.previousBalance,
        newBalance: data.newBalance,
      },
    );
    const updated = await repo.findOneOrFail({ where: { id } });
    return this.toModel(updated);
  }

  private toModel(
    entity: WalletTransactionHistoryEntity,
  ): WalletTransactionHistoryModel {
    return new WalletTransactionHistoryModel({
      id: entity.id,
      walletId: entity.walletId,
      source: entity.source,
      amount: Number(entity.amount),
      previousBalance: Number(entity.previousBalance),
      newBalance: Number(entity.newBalance),
      externalReference: entity.externalReference,
      gatewayChargeId: entity.gatewayChargeId,
      status: entity.status,
      createdAt: entity.createdAt,
    });
  }
}
