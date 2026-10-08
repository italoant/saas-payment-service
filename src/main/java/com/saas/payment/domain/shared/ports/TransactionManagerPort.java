package com.saas.payment.domain.shared.ports;

import java.util.function.Function;

/**
 * Port para executar operacoes dentro de uma transacao atomica.
 *
 * <p>O dominio recebe e repassa um {@link TransactionContext} opaco sem
 * conhecer seu tipo concreto. Isso mantem o use-case agnostico de banco
 * enquanto ainda permite que multiplos repositorios participem da MESMA
 * transacao atomica.
 *
 * <p>Na implementacao Spring (infraestrutura) a atomicidade e garantida pelo
 * {@code TransactionTemplate}, que vincula a transacao a thread corrente; o
 * {@code ctx} e um marcador opaco repassado aos adapters apenas para preservar
 * o mesmo contrato do porte original (NestJS/TypeORM).
 */
public interface TransactionManagerPort {

    /** Contexto transacional opaco (equivalente ao {@code TransactionContext} do TS). */
    interface TransactionContext {
    }

    /**
     * Executa {@code work} dentro de uma transacao atomica. Se {@code work}
     * lancar, a transacao e revertida por completo.
     */
    <T> T runInTransaction(Function<TransactionContext, T> work);
}
