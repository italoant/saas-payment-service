package com.saas.payment.config;

import com.saas.payment.domain.deposit.ports.DepositWebhookLogRepositoryPort;
import com.saas.payment.domain.deposit.ports.PaymentGatewayPort;
import com.saas.payment.domain.deposit.usecases.CreateDepositUseCase;
import com.saas.payment.domain.deposit.usecases.ProcessDepositWebhookUseCase;
import com.saas.payment.domain.shared.ports.TransactionManagerPort;
import com.saas.payment.domain.subscription.ports.CustomerRepositoryPort;
import com.saas.payment.domain.subscription.ports.SubscriptionPaymentRepositoryPort;
import com.saas.payment.domain.subscription.usecases.CreateSubscriptionChargeUseCase;
import com.saas.payment.domain.subscription.usecases.ProcessSubscriptionWebhookUseCase;
import com.saas.payment.domain.wallet.ports.WalletRepositoryPort;
import com.saas.payment.domain.wallet.ports.WalletTransactionRepositoryPort;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Wiring da aplicacao: liga os use-cases do dominio (classes puras, sem
 * anotacoes Spring) aos adapters concretos injetados pelos ports.
 *
 * <p>Este e o unico lugar que monta os use-cases — equivalente a secao
 * {@code providers} do {@code app.module.ts} do porte NestJS. Trocar um
 * adapter (ex.: outro gateway) nao toca no dominio nem aqui, desde que o novo
 * adapter implemente o mesmo port.
 */
@Configuration
@EnableConfigurationProperties(WalletProperties.class)
public class UseCasesConfig {

    /** TransactionTemplate usado pelo {@code SpringTransactionManager}. */
    @Bean
    public TransactionTemplate transactionTemplate(PlatformTransactionManager txManager) {
        return new TransactionTemplate(txManager);
    }

    @Bean
    public CreateDepositUseCase createDepositUseCase(
            PaymentGatewayPort paymentGateway,
            TransactionManagerPort transactionManager,
            WalletRepositoryPort walletRepository,
            WalletTransactionRepositoryPort transactionRepository,
            WalletProperties walletProperties) {
        return new CreateDepositUseCase(paymentGateway, transactionManager, walletRepository,
                transactionRepository, walletProperties.getDefaultCurrency());
    }

    @Bean
    public ProcessDepositWebhookUseCase processDepositWebhookUseCase(
            TransactionManagerPort transactionManager,
            WalletRepositoryPort walletRepository,
            WalletTransactionRepositoryPort transactionRepository,
            DepositWebhookLogRepositoryPort webhookLogRepository,
            WalletProperties walletProperties) {
        return new ProcessDepositWebhookUseCase(transactionManager, walletRepository,
                transactionRepository, webhookLogRepository, walletProperties.getDefaultCurrency());
    }

    @Bean
    public CreateSubscriptionChargeUseCase createSubscriptionChargeUseCase(
            PaymentGatewayPort paymentGateway,
            SubscriptionPaymentRepositoryPort paymentRepository) {
        return new CreateSubscriptionChargeUseCase(paymentGateway, paymentRepository);
    }

    @Bean
    public ProcessSubscriptionWebhookUseCase processSubscriptionWebhookUseCase(
            TransactionManagerPort transactionManager,
            SubscriptionPaymentRepositoryPort paymentRepository,
            CustomerRepositoryPort customerRepository) {
        return new ProcessSubscriptionWebhookUseCase(transactionManager, paymentRepository, customerRepository);
    }
}
