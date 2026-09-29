import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletRepositoryPort } from '@domain/wallet/ports/wallet-repository.port';
import { WalletModel } from '@domain/wallet/models/wallet.model';
import { TransactionContext } from '@domain/shared/ports/transaction-manager.port';
import { WalletEntity } from '../entities/wallet.entity';
import { resolveRepository } from './resolve-repository';

@Injectable()
export class WalletRepositoryAdapter implements WalletRepositoryPort {
  constructor(
    @InjectRepository(WalletEntity)
    private readonly repository: Repository<WalletEntity>,
  ) {}

  async getOrCreate(
    defaultCurrency: string,
    ctx?: TransactionContext,
  ): Promise<WalletModel> {
    const repo = resolveRepository(this.repository, WalletEntity, ctx);

    // Serviço de wallet única: pega a primeira; se não existir, cria.
    let wallet = await repo.find({ order: { walletId: 'ASC' }, take: 1 });
    if (wallet.length === 0) {
      const created = repo.create({ balance: 0, currency: defaultCurrency });
      const saved = await repo.save(created);
      return this.toModel(saved);
    }
    return this.toModel(wallet[0]);
  }

  async updateBalance(
    walletId: number,
    newBalance: number,
    ctx?: TransactionContext,
  ): Promise<void> {
    const repo = resolveRepository(this.repository, WalletEntity, ctx);
    await repo.update({ walletId }, { balance: newBalance });
  }

  private toModel(entity: WalletEntity): WalletModel {
    return new WalletModel({
      walletId: entity.walletId,
      // bigint volta como string no TypeORM; normaliza para number.
      balance: Number(entity.balance),
      currency: entity.currency,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
