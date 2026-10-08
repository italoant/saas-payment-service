package com.saas.payment.infrastructure.database.repositories;

import com.saas.payment.infrastructure.database.entities.WalletEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WalletJpaRepository extends JpaRepository<WalletEntity, Long> {

    /** Retorna a primeira wallet por id crescente (servico de wallet unica). */
    WalletEntity findFirstByOrderByWalletIdAsc();
}
