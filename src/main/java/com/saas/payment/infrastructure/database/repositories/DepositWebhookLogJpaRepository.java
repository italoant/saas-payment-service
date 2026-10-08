package com.saas.payment.infrastructure.database.repositories;

import com.saas.payment.infrastructure.database.entities.DepositWebhookLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepositWebhookLogJpaRepository
        extends JpaRepository<DepositWebhookLogEntity, Long> {
}
