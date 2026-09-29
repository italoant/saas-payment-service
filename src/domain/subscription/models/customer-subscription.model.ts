/**
 * Snapshot mínimo do cliente (tabela `customers` do front) necessário para o
 * fluxo de pagamento. A fonte da verdade é o front; o backend só lê o
 * vencimento atual e escreve o novo ao confirmar o pagamento.
 *
 * Espelha as colunas relevantes do `customers`:
 *   - subStatus  = sub_status  ("pago" | "devendo")
 *   - subDueDate = sub_due_date (ISO; null para assinatura indefinida)
 */
export class CustomerSubscriptionModel {
  /** customer.id no front. */
  id: string;
  /** "pago" | "devendo". */
  subStatus: string;
  /** Vencimento atual (ISO) ou null (indefinida/sem vencimento). */
  subDueDate: string | null;

  constructor(partial: Partial<CustomerSubscriptionModel>) {
    Object.assign(this, partial);
  }
}
