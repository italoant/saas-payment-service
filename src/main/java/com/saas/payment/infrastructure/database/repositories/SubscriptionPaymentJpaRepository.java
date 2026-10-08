package com.saas.payment.infrastructure.database.repositories;

import com.saas.payment.infrastructure.database.entities.SubscriptionPaymentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SubscriptionPaymentJpaRepository
        extends JpaRepository<SubscriptionPaymentEntity, Long> {

    Optional<SubscriptionPaymentEntity> findByGatewayChargeId(String gatewayChargeId);
}
