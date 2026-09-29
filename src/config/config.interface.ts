export type SupportedDbType =
  'postgres' | 'mysql' | 'mariadb' | 'sqlite' | 'mssql';

export interface DatabaseConfig {
  /**
   * Tipo do banco. Trocar aqui (via env DB_TYPE) é o único ponto necessário
   * para plugar outro banco — o domínio não conhece o driver.
   */
  type: SupportedDbType;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  schema?: string;
  synchronize: boolean;
  logging: boolean;
}

export interface WalletConfig {
  defaultCurrency: string;
}

export interface ApplicationConfig {
  port: number;
  environment: string;
}

export interface IConfig {
  application: ApplicationConfig;
  database: DatabaseConfig;
  wallet: WalletConfig;
}
