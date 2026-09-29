export type SupportedDbType =
  'postgres' | 'mysql' | 'mariadb' | 'sqlite' | 'mssql';

export interface DatabaseConfig {
  /**
   * Liga/desliga a camada de banco. Quando false (env DB_ENABLED=false), a
   * aplicação sobe sem conectar a nenhum banco — útil para validar o deploy
   * antes de provisionar o Postgres. As rotas que dependem de persistência
   * respondem 503 em vez de derrubar o processo.
   */
  enabled: boolean;
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
  ssl?: boolean;
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
