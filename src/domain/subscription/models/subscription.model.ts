import { SubscriptionStatusEnum } from '@domain/shared/enums/subscription-status.enum';

/** Limite máximo de dias que uma assinatura vencida pode ser prorrogada. */
export const MAX_EXTENSION_DAYS = 7;

/**
 * Model de domínio de uma Assinatura.
 *
 * Vincula um cliente de um SaaS (`source` + `externalId`) a um plano. O
 * serviço de pagamento é a fonte da verdade sobre vencimento e status: cada
 * pagamento confirmado prorroga `currentPeriodEnd` pelo intervalo do plano.
 *
 * Model puro — a entidade TypeORM correspondente vive na infraestrutura.
 */
export class SubscriptionModel {
  id: number;
  /** SaaS de origem da assinatura (ex.: "saas-a"). */
  source: string;
  /**
   * Identificador do cliente/assinatura no sistema de origem. Único por
   * `source` — garante idempotência ao criar assinaturas.
   */
  externalId: string;
  /** Plano vinculado. */
  planId: number;
  status: SubscriptionStatusEnum;
  /**
   * Fim do período vigente (vencimento). Null enquanto a assinatura está
   * PENDING (sem primeiro pagamento confirmado).
   */
  currentPeriodEnd: Date | null;
  /**
   * Total de dias já prorrogados manualmente (tolerância antes de um novo
   * pagamento), limitado a MAX_EXTENSION_DAYS.
   */
  extendedDays: number;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(partial: Partial<SubscriptionModel>) {
    Object.assign(this, partial);
  }
}
