import { PlanModel } from '@domain/subscription/models/plan.model';
import { TransactionContext } from '@domain/shared/ports/transaction-manager.port';

export interface PlanRepositoryPort {
  /** Cria um plano. */
  create(data: PlanModel, ctx?: TransactionContext): Promise<PlanModel>;

  /** Busca um plano pelo id. Retorna null se não existir. */
  findById(id: number, ctx?: TransactionContext): Promise<PlanModel | null>;

  /** Lista todos os planos (ordem de criação). */
  findAll(ctx?: TransactionContext): Promise<PlanModel[]>;
}
