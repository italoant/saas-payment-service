import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';

/**
 * Cria e configura a aplicação Nest.
 *
 * Recebe opcionalmente um ExpressAdapter para reaproveitar a mesma instância
 * de Express — usado no entrypoint serverless da Vercel (api/index.ts).
 */
export async function createApp(
  expressAdapter?: ExpressAdapter,
): Promise<INestApplication> {
  const app = expressAdapter
    ? await NestFactory.create(AppModule, expressAdapter)
    : await NestFactory.create(AppModule);

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

  return app;
}

/**
 * Bootstrap para execução local (node dist/main / nest start).
 * Na Vercel este bloco não roda: o entrypoint é api/index.ts.
 */
async function bootstrap() {
  const app = await createApp();
  const configService = app.get(ConfigService);
  const port = configService.get<number>('application.port') || 3000;

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`saas-payment-service on http://localhost:${port} (doc: /doc)`);
}

// Só sobe o servidor HTTP quando executado diretamente (não na Vercel).
if (require.main === module) {
  bootstrap();
}
