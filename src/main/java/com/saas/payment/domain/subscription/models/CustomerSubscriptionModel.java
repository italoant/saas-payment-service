package com.saas.payment.domain.subscription.models;

/**
 * Snapshot minimo do cliente (tabela {@code customers} do front) necessario
 * para o fluxo de pagamento. A fonte da verdade e o front; o backend so le o
 * vencimento atual e escreve o novo ao confirmar o pagamento.
 *
 * <p>Espelha as colunas relevantes do {@code customers}:
 * <ul>
 *   <li>subStatus  = sub_status  ("pago" | "devendo")</li>
 *   <li>subDueDate = sub_due_date (ISO; null para assinatura indefinida)</li>
 * </ul>
 */
public class CustomerSubscriptionModel {

    /** customer.id no front. */
    private String id;
    /** "pago" | "devendo". */
    private String subStatus;
    /** Vencimento atual (ISO) ou null (indefinida/sem vencimento). */
    private String subDueDate;

    public CustomerSubscriptionModel() {
    }

    public CustomerSubscriptionModel(String id, String subStatus, String subDueDate) {
        this.id = id;
        this.subStatus = subStatus;
        this.subDueDate = subDueDate;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSubStatus() {
        return subStatus;
    }

    public void setSubStatus(String subStatus) {
        this.subStatus = subStatus;
    }

    public String getSubDueDate() {
        return subDueDate;
    }

    public void setSubDueDate(String subDueDate) {
        this.subDueDate = subDueDate;
    }
}
