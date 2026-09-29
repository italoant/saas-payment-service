import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import config from '@config/config';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { GatewayModule } from '@infrastructure/gateway/gateway.module';
import { AppController } from '@api/app.controller';
import { WebhookController } from '@api/webhook.controller';
import { DepositController } from '@api/deposit.controller';
import { ProcessDepositWebhookUseCase } from '@domain/deposit/use-cases/process-deposit-webhook.use-case';
import { CreateDepositUseCase } from '@domain/deposit/use-cases/create-deposit.use-case';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    DatabaseModule.register(),
    GatewayModule,
  ],
  controllers: [AppController, WebhookController, DepositController],
  providers: [ProcessDepositWebhookUseCase, CreateDepositUseCase],
})
export class AppModule {}
