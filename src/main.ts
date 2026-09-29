import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SaaS Payment Service')
    .setDescription('Gestão genérica de pagamentos para SaaS')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('doc', app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('application.port');

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`saas-payment-service on http://localhost:${port} (doc: /doc)`);
}

bootstrap();
