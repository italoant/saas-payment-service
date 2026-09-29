import { DataSourceOptions } from 'typeorm';
import { DatabaseConfig } from '@config/config.interface';
import { WalletEntity } from './entities/wallet.entity';
import { WalletTransactionHistoryEntity } from './entities/wallet-transaction-history.entity';
import { DepositWebhookLogEntity } from './entities/deposit-webhook-log.entity';

export const ENTITIES = [
  WalletEntity,
  WalletTransactionHistoryEntity,
  DepositWebhookLogEntity,
];

/**
 * Constrói as opções do TypeORM a partir da config da aplicação.
 *
 * Ponto único de contato com o driver: quando você escolher o banco, só as
 * variáveis DB_* mudam. As entidades e migrations são as mesmas — o TypeORM
 * adapta os tipos ao dialeto do banco escolhido.
 */
export function buildDataSourceOptions(db: DatabaseConfig): DataSourceOptions {
  const common = {
    entities: ENTITIES,
    migrations: [__dirname + '/migrations/*.{ts,js}'],
    synchronize: db.synchronize,
    logging: db.logging,
  };

  // SQLite é baseado em arquivo: usa só `database` como caminho do arquivo,
  // sem host/porta/credenciais/schema. Os demais bancos são cliente-servidor.
  if (db.type === 'sqlite') {
    return {
      type: 'sqlite',
      database: db.database,
      ...common,
    } as DataSourceOptions;
  }

  return {
    type: db.type,
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
    schema: db.schema,
    // Bancos gerenciados (Neon, Supabase, Vercel Postgres, RDS) normalmente
    // exigem SSL. Ative com DB_SSL=true; rejectUnauthorized=false cobre certs
    // autoassinados comuns em ambientes gerenciados.
    ssl: db.ssl ? { rejectUnauthorized: false } : undefined,
    ...common,
  } as DataSourceOptions;
}
