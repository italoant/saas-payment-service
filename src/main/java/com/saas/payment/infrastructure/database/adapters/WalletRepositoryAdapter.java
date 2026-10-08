package com.saas.payment.infrastructure.database.adapters;

import com.saas.payment.domain.shared.ports.TransactionManagerPort.TransactionContext;
import com.saas.payment.domain.wallet.models.WalletModel;
import com.saas.payment.domain.wallet.ports.WalletRepositoryPort;
import com.saas.payment.infrastructure.database.entities.WalletEntity;
import com.saas.payment.infrastructure.database.repositories.WalletJpaRepository;
import org.springframework.stereotype.Component;

@Component
public class WalletRepositoryAdapter implements WalletRepositoryPort {

    private final WalletJpaRepository repository;

    public WalletRepositoryAdapter(WalletJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public WalletModel getOrCreate(String defaultCurrency, TransactionContext ctx) {
        // Servico de wallet unica: pega a primeira; se nao existir, cria.
        WalletEntity wallet = repository.findFirstByOrderByWalletIdAsc();
        if (wallet == null) {
            WalletEntity created = new WalletEntity();
            created.setBalance(0L);
            created.setCurrency(defaultCurrency);
            wallet = repository.save(created);
        }
        return toModel(wallet);
    }

    @Override
    public void updateBalance(long walletId, long newBalance, TransactionContext ctx) {
        WalletEntity wallet = repository.findById(walletId).orElseThrow();
        wallet.setBalance(newBalance);
        repository.save(wallet);
    }

    private WalletModel toModel(WalletEntity entity) {
        WalletModel model = new WalletModel();
        model.setWalletId(entity.getWalletId());
        model.setBalance(entity.getBalance());
        model.setCurrency(entity.getCurrency());
        model.setCreatedAt(entity.getCreatedAt());
        model.setUpdatedAt(entity.getUpdatedAt());
        return model;
    }
}
