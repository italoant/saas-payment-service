import { CustomerSubscriptionModel } from '@domain/subscription/models/customer-subscription.model';
import { TransactionContext } from '@domain/shared/ports/transaction-manager.port';

/**
 * Port de saída para o cliente (tabela `customers`, fonte da verdade da
 * assinatura, gerida pelo front). O backend de pagamento apenas:
 *   - lê o vencimento atual (para calcular a prorrogação);
 *   - marca como pago e prorroga o vencimento ao confirmar o pagamento.
 */
export interface CustomerRepositoryPort {
  /** Busca o snapshot da assinatura do cliente. Null se não existir. */
  findById(
    id: string,
    ctx?: TransactionContext,
  ): Promise<CustomerSubscriptionModel | null>;

  /**
   * Marca o cliente como pago e aplica o novo vencimento. Corresponde a
   * `UPDATE customers SET sub_status='pago', sub_due_date=$due WHERE id=$id`.
   */
  markPaid(
    id: string,
    newDueDate: Date,
    ctx?: TransactionContext,
  ): Promise<void>;
}
