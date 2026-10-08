package com.saas.payment.infrastructure.database.repositories;

import com.saas.payment.infrastructure.database.entities.WalletTransactionHistoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WalletTransactionJpaRepository
        extends JpaRepository<WalletTransactionHistoryEntity, Long> {

    Optional<WalletTransactionHistoryEntity> findBySourceAndExternalReference(
            String source, String externalReference);

    Optional<WalletTransactionHistoryEntity> findByGatewayChargeId(String gatewayChargeId);
}
