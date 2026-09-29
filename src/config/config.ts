import { IConfig, SupportedDbType } from './config.interface';

/**
 * Carrega a configuração a partir de variáveis de ambiente.
 *
 * O banco é totalmente parametrizado: quando você decidir qual usar, basta
 * ajustar as variáveis DB_* (principalmente DB_TYPE) e conectar. Nenhuma
 * camada de domínio precisa mudar — a inversão de dependência garante que só
 * a infraestrutura conhece o driver concreto.
 */
export default (): IConfig => ({
  application: {
    port: parseInt(process.env.PORT, 10) || 3000,
    environment: process.env.NODE_ENV || 'development',
  },
  database: {
    type: (process.env.DB_TYPE as SupportedDbType) || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'saas_payments',
    schema: process.env.DB_SCHEMA || undefined,
    synchronize: (process.env.DB_SYNCHRONIZE ?? '').toLowerCase() === 'true',
    logging: (process.env.DB_LOGGING ?? '').toLowerCase() === 'true',
  },
  wallet: {
    defaultCurrency: process.env.WALLET_DEFAULT_CURRENCY || 'BRL',
  },
});
