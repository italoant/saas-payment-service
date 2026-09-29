import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import config from '@config/config';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { AppController } from '@api/app.controller';
import { WebhookController } from '@api/webhook.controller';
import { ProcessDepositWebhookUseCase } from '@domain/deposit/use-cases/process-deposit-webhook.use-case';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    DatabaseModule,
  ],
  controllers: [AppController, WebhookController],
  providers: [ProcessDepositWebhookUseCase],
})
export class AppModule {}
