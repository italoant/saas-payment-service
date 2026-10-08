package com.saas.payment.infrastructure.database.adapters;

import com.saas.payment.domain.shared.ports.TransactionManagerPort.TransactionContext;
import com.saas.payment.domain.subscription.models.CustomerSubscriptionModel;
import com.saas.payment.domain.subscription.ports.CustomerRepositoryPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

/**
 * Adapter do cliente sobre a tabela {@code customers} (mesma base Postgres do
 * Supabase compartilhada com o front). Nao usa entidade JPA propria — a tabela
 * e gerida pelo front; aqui fazemos apenas SELECT/UPDATE das colunas de
 * assinatura via SQL, para nao acoplar o backend ao schema completo do
 * {@code customers}.
 *
 * <p>Usa {@link JdbcTemplate}, que participa automaticamente da transacao ativa
 * (vinculada a thread pelo {@code TransactionTemplate}) quando chamado dentro
 * de {@code runInTransaction}.
 */
@Component
public class CustomerRepositoryAdapter implements CustomerRepositoryPort {

    private final JdbcTemplate jdbcTemplate;

    public CustomerRepositoryAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public CustomerSubscriptionModel findById(String id, TransactionContext ctx) {
        List<CustomerSubscriptionModel> rows = jdbcTemplate.query(
                "SELECT id, sub_status, sub_due_date FROM customers WHERE id = ? LIMIT 1",
                (rs, rowNum) -> new CustomerSubscriptionModel(
                        rs.getString("id"),
                        rs.getString("sub_status"),
                        rs.getString("sub_due_date")),
                id);
        if (rows.isEmpty()) {
            return null;
        }
        return rows.get(0);
    }

    @Override
    public void markPaid(String id, Instant newDueDate, TransactionContext ctx) {
        jdbcTemplate.update(
                "UPDATE customers SET sub_status = 'pago', sub_due_date = ? WHERE id = ?",
                newDueDate.toString(), id);
    }
}
