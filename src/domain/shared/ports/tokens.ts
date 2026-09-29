/**
 * Tokens de injeção para os ports do domínio.
 *
 * O domínio declara estes símbolos; a infraestrutura provê as implementações
 * concretas (adapters TypeORM) associadas a cada token no módulo. Assim o
 * domínio depende apenas da abstração, nunca do driver de banco.
 */
export const WALLET_REPOSITORY = Symbol('WALLET_REPOSITORY');
export const WALLET_TRANSACTION_REPOSITORY = Symbol(
  'WALLET_TRANSACTION_REPOSITORY',
);
export const DEPOSIT_WEBHOOK_LOG_REPOSITORY = Symbol(
  'DEPOSIT_WEBHOOK_LOG_REPOSITORY',
);
/** Port para executar operações dentro de uma transação atômica. */
export const TRANSACTION_MANAGER = Symbol('TRANSACTION_MANAGER');
