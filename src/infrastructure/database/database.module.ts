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
import { createUnavailableRepository } from './adapters/unavailable-repository';

const PORT_TOKENS = [
  TRANSACTION_MANAGER,
  WALLET_REPOSITORY,
  WALLET_TRANSACTION_REPOSITORY,
  DEPOSIT_WEBHOOK_LOG_REPOSITORY,
  PLAN_REPOSITORY,
  SUBSCRIPTION_REPOSITORY,
  SUBSCRIPTION_PAYMENT_REPOSITORY,
];

/**
 * Providers reais (TypeORM) usados quando o banco está habilitado.
 */
const realProviders: Provider[] = [
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
 * Providers substitutos: a app sobe sem banco e cada token responde 503 ao
 * ser usado (DB_ENABLED=false).
 */
const stubProviders: Provider[] = PORT_TOKENS.map((token) => ({
  provide: token,
  useFactory: () => createUnavailableRepository(),
}));

/**
 * Módulo de banco desacoplado e condicional.
 *
 * - DB_ENABLED=true (default): conecta via TypeORM e liga os adapters reais.
 * - DB_ENABLED=false: não conecta a nada; a aplicação sobe saudável e as
 *   rotas de persistência respondem 503. Útil para validar o deploy antes de
 *   provisionar o Postgres.
 *
 * A decisão é lida do ambiente em tempo de import do módulo (register()),
 * pois a topologia de imports do Nest precisa ser resolvida antes do DI.
 */
@Global()
@Module({})
export class DatabaseModule {
  static register(): DynamicModule {
    const enabled = (process.env.DB_ENABLED ?? 'true').toLowerCase() !== 'false';

    if (!enabled) {
      return {
        module: DatabaseModule,
        providers: stubProviders,
        exports: PORT_TOKENS,
      };
    }

    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) =>
            buildDataSourceOptions(configService.get<IConfig['database']>('database')),
        }),
        TypeOrmModule.forFeature([
          WalletEntity,
          WalletTransactionHistoryEntity,
          DepositWebhookLogEntity,
          PlanEntity,
          SubscriptionEntity,
          SubscriptionPaymentEntity,
        ]),
      ],
      providers: realProviders,
      exports: PORT_TOKENS,
    };
  }
}
