import 'reflect-metadata';
import express, { Express, Request, Response } from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
// Importa do build compilado (dist), onde o tsc-alias já converteu os
// aliases (@config, @domain, ...) em caminhos relativos válidos em runtime.
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { createApp } from '../dist/main';

/**
 * Entrypoint serverless para a Vercel.
 *
 * A Vercel invoca este handler por requisição. Fazemos cache da instância
 * Express/Nest em escopo de módulo para reaproveitar entre invocações quentes
 * (evita reinicializar o Nest a cada request).
 */
let cachedServer: Express | null = null;

async function bootstrapServer(): Promise<Express> {
  if (cachedServer) {
    return cachedServer;
  }

  const expressApp = express();
  const app = await createApp(new ExpressAdapter(expressApp));
  await app.init();

  cachedServer = expressApp;
  return expressApp;
}

export default async function handler(req: Request, res: Response) {
  const server = await bootstrapServer();
  return server(req, res);
}
