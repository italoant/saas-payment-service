import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ExpressAdapter } from '@nestjs/platform-express';
import { timingSafeEqual } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';

/**
 * Compara duas strings em tempo constante (evita timing attacks).
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Middleware de HTTP Basic Auth para proteger a documentação do Swagger.
 *
 * Credenciais via env SWAGGER_USER / SWAGGER_PASSWORD. Há um padrão apenas
 * para conveniência inicial — troque em produção definindo as variáveis.
 */
function swaggerAuth(req: Request, res: Response, next: NextFunction): void {
  const user = process.env.SWAGGER_USER || 'admin';
  const password = process.env.SWAGGER_PASSWORD || 'changeme';

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const sep = decoded.indexOf(':');
    const givenUser = decoded.slice(0, sep);
    const givenPass = decoded.slice(sep + 1);

    if (safeEqual(givenUser, user) && safeEqual(givenPass, password)) {
      next();
      return;
    }
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Swagger", charset="UTF-8"');
  res.status(401).send('Authentication required.');
}

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

  // Protege a doc (UI e JSON) com Basic Auth antes de registrar o Swagger.
  app.use(['/doc', '/doc-json'], swaggerAuth);

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
