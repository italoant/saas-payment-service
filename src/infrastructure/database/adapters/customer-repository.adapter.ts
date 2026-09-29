import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { CustomerRepositoryPort } from '@domain/subscription/ports/customer-repository.port';
import { CustomerSubscriptionModel } from '@domain/subscription/models/customer-subscription.model';
import { TransactionContext } from '@domain/shared/ports/transaction-manager.port';

/**
 * Adapter do cliente sobre a tabela `customers` (mesma base Postgres do
 * Supabase compartilhada com o front). Não usa entidade TypeORM própria — a
 * tabela é gerida pelo front (migrations do Supabase/SQL do front); aqui
 * fazemos apenas SELECT/UPDATE das colunas de assinatura via SQL, para não
 * acoplar o backend ao schema completo do `customers`.
 */
@Injectable()
export class CustomerRepositoryAdapter implements CustomerRepositoryPort {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Usa o EntityManager transacional quando há contexto; senão o global. */
  private manager(ctx?: TransactionContext): EntityManager {
    return ctx instanceof EntityManager ? ctx : this.dataSource.manager;
  }

  async findById(
    id: string,
    ctx?: TransactionContext,
  ): Promise<CustomerSubscriptionModel | null> {
    const rows: Array<{ id: string; sub_status: string; sub_due_date: string | null }> =
      await this.manager(ctx).query(
        'SELECT id, sub_status, sub_due_date FROM customers WHERE id = $1 LIMIT 1',
        [id],
      );
    if (!rows || rows.length === 0) {
      return null;
    }
    const row = rows[0];
    return new CustomerSubscriptionModel({
      id: row.id,
      subStatus: row.sub_status,
      subDueDate: row.sub_due_date,
    });
  }

  async markPaid(
    id: string,
    newDueDate: Date,
    ctx?: TransactionContext,
  ): Promise<void> {
    await this.manager(ctx).query(
      "UPDATE customers SET sub_status = 'pago', sub_due_date = $2 WHERE id = $1",
      [id, newDueDate.toISOString()],
    );
  }
}
