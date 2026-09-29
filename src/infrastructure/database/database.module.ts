import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CUSTOMER_REPOSITORY,
  DEPOSIT_WEBHOOK_LOG_REPOSITORY,
  SUBSCRIPTION_PAYMENT_REPOSITORY,
  TRANSACTION_MANAGER,
  WALLET_REPOSITORY,
  WALLET_TRANSACTION_REPOSITORY,
} from '@domain/shared/ports/tokens';
import type { IConfig } from '@config/config.interface';
import { WalletEntity } from './entities/wallet.entity';
import { WalletTransactionHistoryEntity } from './entities/wallet-transaction-history.entity';
import { DepositWebhookLogEntity } from './entities/deposit-webhook-log.entity';
import { SubscriptionPaymentEntity } from './entities/subscription-payment.entity';
import { buildDataSourceOptions } from './typeorm-options';
import { TypeormTransactionManager } from './adapters/typeorm-transaction-manager';
import { WalletRepositoryAdapter } from './adapters/wallet-repository.adapter';
import { WalletTransactionRepositoryAdapter } from './adapters/wallet-transaction-repository.adapter';
import { DepositWebhookLogRepositoryAdapter } from './adapters/deposit-webhook-log-repository.adapter';
import { SubscriptionPaymentRepositoryAdapter } from './adapters/subscription-payment-repository.adapter';
import { CustomerRepositoryAdapter } from './adapters/customer-repository.adapter';

const PORT_TOKENS = [
  TRANSACTION_MANAGER,
  WALLET_REPOSITORY,
  WALLET_TRANSACTION_REPOSITORY,
  DEPOSIT_WEBHOOK_LOG_REPOSITORY,
  SUBSCRIPTION_PAYMENT_REPOSITORY,
  CUSTOMER_REPOSITORY,
];

const ENTITIES = [
  WalletEntity,
  WalletTransactionHistoryEntity,
  DepositWebhookLogEntity,
  SubscriptionPaymentEntity,
];

/**
 * Providers TypeORM que ligam cada port do domínio ao seu adapter concreto.
 */
const providers: Provider[] = [
  { provide: TRANSACTION_MANAGER, useClass: TypeormTransactionManager },
  { provide: WALLET_REPOSITORY, useClass: WalletRepositoryAdapter },
  {
    provide: WALLET_TRANSACTION_REPOSITORY,
    useClass: WalletTransactionRepositoryAdapter,
  },
  {
    provide: DEPOSIT_WEBHOOK_LOG_REPOSITORY,
    useClass: DepositWebhookLogRepositoryAdapter,
  },
  {
    provide: SUBSCRIPTION_PAYMENT_REPOSITORY,
    useClass: SubscriptionPaymentRepositoryAdapter,
  },
  { provide: CUSTOMER_REPOSITORY, useClass: CustomerRepositoryAdapter },
];

/**
 * Módulo de banco.
 *
 * O banco é obrigatório: a aplicação conecta via TypeORM ao subir. Se a
 * conexão falhar (credenciais/rede/DB indisponível), o bootstrap do Nest
 * falha e o processo não sobe — não há modo degradado. Configure as
 * variáveis DB_* (ver .env.example) apontando para o Postgres.
 *
 * A tabela `customers` (fonte da verdade da assinatura, gerida pelo front)
 * NÃO tem entidade aqui: o CustomerRepositoryAdapter a acessa por SQL, pois
 * ela vive no mesmo Postgres do Supabase compartilhado com o front.
 */
@Global()
@Module({})
export class DatabaseModule {
  static register(): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) =>
            buildDataSourceOptions(
              configService.get<IConfig['database']>('database'),
            ),
        }),
        TypeOrmModule.forFeature(ENTITIES),
      ],
      providers,
      exports: PORT_TOKENS,
    };
  }
}
