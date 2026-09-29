import 'reflect-metadata';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import loadConfig from '@config/config';
import { buildDataSourceOptions } from './typeorm-options';

/**
 * DataSource usado pelo CLI do TypeORM para gerar/rodar migrations.
 *
 * Carrega variáveis de um arquivo de ambiente ANTES de ler a config. A ordem
 * de precedência é:
 *   1. variáveis já presentes no processo (ex.: exportadas no shell / CI);
 *   2. `.env.migrations` — endpoint de migration do banco (Supabase: conexão
 *      DIRETA / Session pooler, porta 5432). É o recomendado para rodar
 *      migrations, pois exige sessão persistente (locks);
 *   3. `.env` — fallback (dev local com sqlite, por exemplo).
 *
 * `dotenv` não sobrescreve variáveis já definidas, então exportar no shell
 * continua tendo prioridade. Depois de preencher o `.env.migrations`, rode:
 *   npm run migration:run
 */
const migrationsEnv = resolve(process.cwd(), '.env.migrations');
if (existsSync(migrationsEnv)) {
  loadEnv({ path: migrationsEnv });
}
// Fallback: carrega .env se ainda faltarem variáveis (não sobrescreve).
loadEnv();

const config = loadConfig();

export default new DataSource(buildDataSourceOptions(config.database));
