package com.saas.payment.infrastructure.database.adapters;

import com.saas.payment.domain.shared.ports.TransactionManagerPort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.function.Function;

/**
 * Implementacao do {@link TransactionManagerPort} com Spring.
 *
 * <p>Usa {@link TransactionTemplate} para executar o trabalho dentro de uma
 * transacao atomica vinculada a thread corrente — todos os adapters JPA/JDBC
 * invocados dentro do callback participam da mesma transacao. O {@code ctx}
 * repassado ao dominio e um marcador opaco (singleton), preservando o mesmo
 * contrato do porte original (NestJS/TypeORM), onde o dominio nunca inspeciona
 * o contexto.
 */
@Component
public class SpringTransactionManager implements TransactionManagerPort {

    /** Marcador opaco unico repassado ao dominio. */
    private static final TransactionContext CONTEXT = new TransactionContext() {
    };

    private final TransactionTemplate transactionTemplate;

    public SpringTransactionManager(TransactionTemplate transactionTemplate) {
        this.transactionTemplate = transactionTemplate;
    }

    @Override
    public <T> T runInTransaction(Function<TransactionContext, T> work) {
        return transactionTemplate.execute(status -> work.apply(CONTEXT));
    }
}
