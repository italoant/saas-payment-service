import 'reflect-metadata';
import { DataSource } from 'typeorm';
import loadConfig from '@config/config';
import { buildDataSourceOptions } from './typeorm-options';

/**
 * DataSource usado pelo CLI do TypeORM para gerar/rodar migrations.
 *
 * Lê as mesmas variáveis de ambiente da aplicação. Depois de escolher o banco
 * e preencher o .env, rode:
 *   npm run migration:generate -- src/infrastructure/database/migrations/Init
 *   npm run migration:run
 */
const config = loadConfig();

export default new DataSource(buildDataSourceOptions(config.database));
