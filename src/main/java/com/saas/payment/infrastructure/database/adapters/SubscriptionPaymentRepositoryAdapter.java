package com.saas.payment.infrastructure.database.adapters;

import com.saas.payment.domain.shared.enums.SubscriptionPaymentStatusEnum;
import com.saas.payment.domain.shared.ports.TransactionManagerPort.TransactionContext;
import com.saas.payment.domain.subscription.models.SubscriptionPaymentModel;
import com.saas.payment.domain.subscription.ports.SubscriptionPaymentRepositoryPort;
import com.saas.payment.infrastructure.database.entities.SubscriptionPaymentEntity;
import com.saas.payment.infrastructure.database.repositories.SubscriptionPaymentJpaRepository;
import org.springframework.stereotype.Component;

@Component
public class SubscriptionPaymentRepositoryAdapter implements SubscriptionPaymentRepositoryPort {

    private final SubscriptionPaymentJpaRepository repository;

    public SubscriptionPaymentRepositoryAdapter(SubscriptionPaymentJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public SubscriptionPaymentModel create(SubscriptionPaymentModel data, TransactionContext ctx) {
        SubscriptionPaymentEntity entity = new SubscriptionPaymentEntity();
        entity.setSource(data.getSource());
        entity.setExternalId(data.getExternalId());
        entity.setAmount(data.getAmount());
        entity.setIntervalDays(data.getIntervalDays());
        entity.setGatewayChargeId(data.getGatewayChargeId());
        entity.setStatus(data.getStatus().getValue());
        entity.setPaidPeriodEnd(data.getPaidPeriodEnd());
        return toModel(repository.save(entity));
    }

    @Override
    public SubscriptionPaymentModel findByGatewayChargeId(String gatewayChargeId, TransactionContext ctx) {
        return repository.findByGatewayChargeId(gatewayChargeId)
                .map(this::toModel)
                .orElse(null);
    }

    @Override
    public SubscriptionPaymentModel updateSettlement(long id, SettlementData data, TransactionContext ctx) {
        SubscriptionPaymentEntity entity = repository.findById(id).orElseThrow();
        entity.setStatus(data.status().getValue());
        entity.setPaidPeriodEnd(data.paidPeriodEnd());
        return toModel(repository.save(entity));
    }

    private SubscriptionPaymentModel toModel(SubscriptionPaymentEntity entity) {
        SubscriptionPaymentModel model = new SubscriptionPaymentModel();
        model.setId(entity.getId());
        model.setSource(entity.getSource());
        model.setExternalId(entity.getExternalId());
        model.setAmount(entity.getAmount());
        model.setIntervalDays(entity.getIntervalDays());
        model.setGatewayChargeId(entity.getGatewayChargeId());
        model.setStatus(SubscriptionPaymentStatusEnum.fromValue(entity.getStatus()));
        model.setPaidPeriodEnd(entity.getPaidPeriodEnd());
        model.setCreatedAt(entity.getCreatedAt());
        return model;
    }
}
