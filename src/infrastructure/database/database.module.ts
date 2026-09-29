import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DEPOSIT_WEBHOOK_LOG_REPOSITORY,
  TRANSACTION_MANAGER,
  WALLET_REPOSITORY,
  WALLET_TRANSACTION_REPOSITORY,
} from '@domain/shared/ports/tokens';
import { WalletEntity } from './entities/wallet.entity';
import { WalletTransactionHistoryEntity } from './entities/wallet-transaction-history.entity';
import { DepositWebhookLogEntity } from './entities/deposit-webhook-log.entity';
import { buildDataSourceOptions } from './typeorm-options';
import { TypeormTransactionManager } from './adapters/typeorm-transaction-manager';
import { WalletRepositoryAdapter } from './adapters/wallet-repository.adapter';
import { WalletTransactionRepositoryAdapter } from './adapters/wallet-transaction-repository.adapter';
import { DepositWebhookLogRepositoryAdapter } from './adapters/deposit-webhook-log-repository.adapter';

/**
 * Módulo de banco desacoplado.
 *
 * Aqui é o único lugar que conhece o driver concreto (via TypeOrmModule) e
 * associa cada port do domínio ao seu adapter. O resto da aplicação injeta
 * pelos tokens, sem saber que por trás há TypeORM.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        buildDataSourceOptions(configService.get('database')),
    }),
    TypeOrmModule.forFeature([
      WalletEntity,
      WalletTransactionHistoryEntity,
      DepositWebhookLogEntity,
    ]),
  ],
  providers: [
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
  ],
  exports: [
    TRANSACTION_MANAGER,
    WALLET_REPOSITORY,
    WALLET_TRANSACTION_REPOSITORY,
    DEPOSIT_WEBHOOK_LOG_REPOSITORY,
  ],
})
export class DatabaseModule {}
