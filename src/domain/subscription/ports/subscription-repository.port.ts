import { SubscriptionModel } from '@domain/subscription/models/subscription.model';
import { SubscriptionStatusEnum } from '@domain/shared/enums/subscription-status.enum';
import { TransactionContext } from '@domain/shared/ports/transaction-manager.port';

export interface SubscriptionRepositoryPort {
  /** Cria uma assinatura. */
  create(
    data: SubscriptionModel,
    ctx?: TransactionContext,
  ): Promise<SubscriptionModel>;

  /** Busca uma assinatura pelo id. Retorna null se não existir. */
  findById(
    id: number,
    ctx?: TransactionContext,
  ): Promise<SubscriptionModel | null>;

  /**
   * Busca por (source, externalId) — usada para idempotência ao criar
   * assinaturas e para localizar a assinatura de um cliente.
   */
  findBySourceAndExternalId(
    source: string,
    externalId: string,
    ctx?: TransactionContext,
  ): Promise<SubscriptionModel | null>;

  /**
   * Atualiza o vencimento/estado após um pagamento confirmado ou uma
   * prorrogação manual.
   */
  updatePeriod(
    id: number,
    data: {
      status: SubscriptionStatusEnum;
      currentPeriodEnd: Date;
      extendedDays: number;
    },
    ctx?: TransactionContext,
  ): Promise<SubscriptionModel>;
}
