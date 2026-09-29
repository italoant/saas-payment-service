import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import config from '@config/config';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { GatewayModule } from '@infrastructure/gateway/gateway.module';
import { AppController } from '@api/app.controller';
import { WebhookController } from '@api/webhook.controller';
import { DepositController } from '@api/deposit.controller';
import { PlanController } from '@api/plan.controller';
import { SubscriptionController } from '@api/subscription.controller';
import { SubscriptionWebhookController } from '@api/subscription-webhook.controller';
import { ProcessDepositWebhookUseCase } from '@domain/deposit/use-cases/process-deposit-webhook.use-case';
import { CreateDepositUseCase } from '@domain/deposit/use-cases/create-deposit.use-case';
import { CreatePlanUseCase } from '@domain/subscription/use-cases/create-plan.use-case';
import { CreateSubscriptionChargeUseCase } from '@domain/subscription/use-cases/create-subscription-charge.use-case';
import { ProcessSubscriptionWebhookUseCase } from '@domain/subscription/use-cases/process-subscription-webhook.use-case';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    DatabaseModule.register(),
    GatewayModule,
  ],
  controllers: [
    AppController,
    WebhookController,
    DepositController,
    PlanController,
    SubscriptionController,
    SubscriptionWebhookController,
  ],
  providers: [
    ProcessDepositWebhookUseCase,
    CreateDepositUseCase,
    CreatePlanUseCase,
    CreateSubscriptionChargeUseCase,
    ProcessSubscriptionWebhookUseCase,
  ],
})
export class AppModule {}
