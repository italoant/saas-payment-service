package com.saas.payment.domain.wallet.ports;

import com.saas.payment.domain.shared.ports.TransactionManagerPort.TransactionContext;
import com.saas.payment.domain.wallet.models.WalletModel;

public interface WalletRepositoryPort {

    /**
     * Retorna a wallet de gestao. Como o servico opera com uma unica wallet,
     * este metodo a garante (cria na primeira chamada se nao existir).
     *
     * @param defaultCurrency moeda usada caso a wallet ainda nao exista.
     * @param ctx             contexto transacional opcional.
     */
    WalletModel getOrCreate(String defaultCurrency, TransactionContext ctx);

    /**
     * Atualiza o saldo da wallet. Deve ser chamado dentro de uma transacao
     * junto com a criacao do historico para manter consistencia.
     */
    void updateBalance(long walletId, long newBalance, TransactionContext ctx);
}
