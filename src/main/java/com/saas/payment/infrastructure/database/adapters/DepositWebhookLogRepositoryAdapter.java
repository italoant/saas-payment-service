package com.saas.payment.infrastructure.database.adapters;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.saas.payment.domain.deposit.models.DepositWebhookLogModel;
import com.saas.payment.domain.deposit.ports.DepositWebhookLogRepositoryPort;
import com.saas.payment.domain.shared.ports.TransactionManagerPort.TransactionContext;
import com.saas.payment.infrastructure.database.entities.DepositWebhookLogEntity;
import com.saas.payment.infrastructure.database.repositories.DepositWebhookLogJpaRepository;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class DepositWebhookLogRepositoryAdapter implements DepositWebhookLogRepositoryPort {

    private final DepositWebhookLogJpaRepository repository;
    private final ObjectMapper objectMapper;

    public DepositWebhookLogRepositoryAdapter(DepositWebhookLogJpaRepository repository,
                                              ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Override
    public DepositWebhookLogModel create(DepositWebhookLogModel data, TransactionContext ctx) {
        DepositWebhookLogEntity entity = new DepositWebhookLogEntity();
        entity.setSource(data.getSource());
        entity.setPayload(serialize(data.getPayload()));
        entity.setWalletTransactionId(data.getWalletTransactionId());
        return toModel(repository.save(entity));
    }

    @Override
    public void linkToTransaction(long logId, long walletTransactionId, TransactionContext ctx) {
        DepositWebhookLogEntity entity = repository.findById(logId).orElseThrow();
        entity.setWalletTransactionId(walletTransactionId);
        repository.save(entity);
    }

    private String serialize(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload != null ? payload : Map.of());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize webhook payload", e);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> deserialize(String payload) {
        if (payload == null || payload.isEmpty()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(payload, Map.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to deserialize webhook payload", e);
        }
    }

    private DepositWebhookLogModel toModel(DepositWebhookLogEntity entity) {
        DepositWebhookLogModel model = new DepositWebhookLogModel();
        model.setId(entity.getId());
        model.setSource(entity.getSource());
        model.setPayload(deserialize(entity.getPayload()));
        model.setWalletTransactionId(entity.getWalletTransactionId());
        model.setCreatedAt(entity.getCreatedAt());
        return model;
    }
}
