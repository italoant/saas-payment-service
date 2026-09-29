import { EntityManager, EntityTarget, Repository } from 'typeorm';
import { TransactionContext } from '@domain/shared/ports/transaction-manager.port';

/**
 * Resolve o Repository correto: se um contexto transacional (EntityManager)
 * foi passado pelo use-case, usa o repositório ligado à transação; senão, usa
 * o repositório padrão. Centraliza a checagem para os adapters não repetirem.
 */
export function resolveRepository<T>(
  defaultRepository: Repository<T>,
  entity: EntityTarget<T>,
  ctx?: TransactionContext,
): Repository<T> {
  if (ctx instanceof EntityManager) {
    return ctx.getRepository<T>(entity);
  }
  return defaultRepository;
}
