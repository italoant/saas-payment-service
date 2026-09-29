/**
 * Contexto transacional opaco.
 *
 * O domínio recebe e repassa este contexto sem conhecer seu tipo concreto
 * (na infra é o EntityManager do TypeORM). Isso mantém o use-case agnóstico
 * de banco enquanto ainda permite que múltiplos repositórios participem da
 * MESMA transação atômica.
 */
export type TransactionContext = unknown;

export interface TransactionManagerPort {
  /**
   * Executa `work` dentro de uma transação atômica. Se `work` lançar, a
   * transação é revertida por completo.
   */
  runInTransaction<T>(
    work: (ctx: TransactionContext) => Promise<T>,
  ): Promise<T>;
}
