import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DEPOSIT_WEBHOOK_LOG_REPOSITORY,
  PLAN_REPOSITORY,
  SUBSCRIPTION_PAYMENT_REPOSITORY,
  SUBSCRIPTION_REPOSITORY,
  TRANSACTION_MANAGER,
  WALLET_REPOSITORY,
  WALLET_TRANSACTION_REPOSITORY,
} from '@domain/shared/ports/tokens';
import type { IConfig } from '@config/config.interface';
import { WalletEntity } from './entities/wallet.entity';
import { WalletTransactionHistoryEntity } from './entities/wallet-transaction-history.entity';
import { DepositWebhookLogEntity } from './entities/deposit-webhook-log.entity';
import { PlanEntity } from './entities/plan.entity';
import { SubscriptionEntity } from './entities/subscription.entity';
import { SubscriptionPaymentEntity } from './entities/subscription-payment.entity';
import { buildDataSourceOptions } from './typeorm-options';
import { TypeormTransactionManager } from './adapters/typeorm-transaction-manager';
import { WalletRepositoryAdapter } from './adapters/wallet-repository.adapter';
import { WalletTransactionRepositoryAdapter } from './adapters/wallet-transaction-repository.adapter';
import { DepositWebhookLogRepositoryAdapter } from './adapters/deposit-webhook-log-repository.adapter';
import { PlanRepositoryAdapter } from './adapters/plan-repository.adapter';
import { SubscriptionRepositoryAdapter } from './adapters/subscription-repository.adapter';
import { SubscriptionPaymentRepositoryAdapter } from './adapters/subscription-payment-repository.adapter';

const PORT_TOKENS = [
  TRANSACTION_MANAGER,
  WALLET_REPOSITORY,
  WALLET_TRANSACTION_REPOSITORY,
  DEPOSIT_WEBHOOK_LOG_REPOSITORY,
  PLAN_REPOSITORY,
  SUBSCRIPTION_REPOSITORY,
  SUBSCRIPTION_PAYMENT_REPOSITORY,
];

const ENTITIES = [
  WalletEntity,
  WalletTransactionHistoryEntity,
  DepositWebhookLogEntity,
  PlanEntity,
  SubscriptionEntity,
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
  { provide: PLAN_REPOSITORY, useClass: PlanRepositoryAdapter },
  { provide: SUBSCRIPTION_REPOSITORY, useClass: SubscriptionRepositoryAdapter },
  {
    provide: SUBSCRIPTION_PAYMENT_REPOSITORY,
    useClass: SubscriptionPaymentRepositoryAdapter,
  },
];

/**
 * Módulo de banco.
 *
 * O banco é obrigatório: a aplicação conecta via TypeORM ao subir. Se a
 * conexão falhar (credenciais/rede/DB indisponível), o bootstrap do Nest
 * falha e o processo não sobe — não há modo degradado. Configure as
 * variáveis DB_* (ver .env.example) apontando para o Postgres.
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
