import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  TransactionContext,
  TransactionManagerPort,
} from '@domain/shared/ports/transaction-manager.port';

/**
 * Implementação do TransactionManagerPort com TypeORM.
 *
 * O `ctx` repassado ao domínio é, concretamente, o EntityManager transacional
 * do TypeORM — mas o domínio o trata como opaco.
 */
@Injectable()
export class TypeormTransactionManager implements TransactionManagerPort {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async runInTransaction<T>(
    work: (ctx: TransactionContext) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction((manager: EntityManager) =>
      work(manager),
    );
  }
}
