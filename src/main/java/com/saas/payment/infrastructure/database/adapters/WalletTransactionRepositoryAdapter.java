package com.saas.payment.infrastructure.database.adapters;

import com.saas.payment.domain.shared.enums.TransactionStatusEnum;
import com.saas.payment.domain.shared.ports.TransactionManagerPort.TransactionContext;
import com.saas.payment.domain.wallet.models.WalletTransactionHistoryModel;
import com.saas.payment.domain.wallet.ports.WalletTransactionRepositoryPort;
import com.saas.payment.infrastructure.database.entities.WalletTransactionHistoryEntity;
import com.saas.payment.infrastructure.database.repositories.WalletTransactionJpaRepository;
import org.springframework.stereotype.Component;

@Component
public class WalletTransactionRepositoryAdapter implements WalletTransactionRepositoryPort {

    private final WalletTransactionJpaRepository repository;

    public WalletTransactionRepositoryAdapter(WalletTransactionJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public WalletTransactionHistoryModel create(WalletTransactionHistoryModel data, TransactionContext ctx) {
        WalletTransactionHistoryEntity entity = new WalletTransactionHistoryEntity();
        entity.setWalletId(data.getWalletId());
        entity.setSource(data.getSource());
        entity.setAmount(data.getAmount());
        entity.setPreviousBalance(data.getPreviousBalance());
        entity.setNewBalance(data.getNewBalance());
        entity.setExternalReference(data.getExternalReference());
        entity.setGatewayChargeId(data.getGatewayChargeId());
        entity.setStatus(data.getStatus().getValue());
        return toModel(repository.save(entity));
    }

    @Override
    public WalletTransactionHistoryModel findByExternalReference(String source, String externalReference,
                                                                 TransactionContext ctx) {
        return repository.findBySourceAndExternalReference(source, externalReference)
                .map(this::toModel)
                .orElse(null);
    }

    @Override
    public WalletTransactionHistoryModel findByGatewayChargeId(String gatewayChargeId, TransactionContext ctx) {
        return repository.findByGatewayChargeId(gatewayChargeId)
                .map(this::toModel)
                .orElse(null);
    }

    @Override
    public WalletTransactionHistoryModel updateSettlement(long id, SettlementData data, TransactionContext ctx) {
        WalletTransactionHistoryEntity entity = repository.findById(id).orElseThrow();
        entity.setStatus(data.status().getValue());
        entity.setPreviousBalance(data.previousBalance());
        entity.setNewBalance(data.newBalance());
        return toModel(repository.save(entity));
    }

    private WalletTransactionHistoryModel toModel(WalletTransactionHistoryEntity entity) {
        WalletTransactionHistoryModel model = new WalletTransactionHistoryModel();
        model.setId(entity.getId());
        model.setWalletId(entity.getWalletId());
        model.setSource(entity.getSource());
        model.setAmount(entity.getAmount());
        model.setPreviousBalance(entity.getPreviousBalance());
        model.setNewBalance(entity.getNewBalance());
        model.setExternalReference(entity.getExternalReference());
        model.setGatewayChargeId(entity.getGatewayChargeId());
        model.setStatus(TransactionStatusEnum.fromValue(entity.getStatus()));
        model.setCreatedAt(entity.getCreatedAt());
        return model;
    }
}
