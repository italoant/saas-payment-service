import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration inicial das tabelas de wallet e depósito: `wallet`,
 * `wallet_transaction_history` e `deposit_webhook_log`.
 *
 * Essas tabelas existiam apenas via `synchronize` em dev; esta migration as
 * torna reproduzíveis em qualquer banco (Supabase/Postgres em produção). Roda
 * ANTES da migration de assinaturas (timestamp menor).
 *
 * Usa a API `Table`/`TableIndex` (agnóstica de dialeto). Índices únicos
 * garantem a idempotência de crédito, como nas entidades.
 */
export class InitWallet1729990000000 implements MigrationInterface {
  name = 'InitWallet1729990000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    const pk = {
      type: isPostgres ? 'int' : 'integer',
      isPrimary: true,
      isGenerated: true,
      generationStrategy: 'increment' as const,
    };
    const timestampType = isPostgres ? 'timestamp' : 'datetime';
    const nowDefault = isPostgres ? 'now()' : 'CURRENT_TIMESTAMP';

    // ---------- wallet ----------
    await queryRunner.createTable(
      new Table({
        name: 'wallet',
        columns: [
          { name: 'wallet_id', ...pk },
          { name: 'balance', type: 'bigint', default: 0 },
          { name: 'currency', type: 'varchar', length: '3', default: "'BRL'" },
          { name: 'created_at', type: timestampType, default: nowDefault },
          { name: 'updated_at', type: timestampType, default: nowDefault },
        ],
      }),
      true,
    );

    // ---------- wallet_transaction_history ----------
    await queryRunner.createTable(
      new Table({
        name: 'wallet_transaction_history',
        columns: [
          { name: 'id', ...pk },
          { name: 'wallet_id', type: 'int' },
          { name: 'source', type: 'varchar', length: '100' },
          { name: 'amount', type: 'bigint' },
          { name: 'previous_balance', type: 'bigint' },
          { name: 'new_balance', type: 'bigint' },
          {
            name: 'external_reference',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'gateway_charge_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'completed'",
          },
          { name: 'created_at', type: timestampType, default: nowDefault },
        ],
        foreignKeys: [
          {
            columnNames: ['wallet_id'],
            referencedTableName: 'wallet',
            referencedColumnNames: ['wallet_id'],
          },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'wallet_transaction_history',
      new TableIndex({
        name: 'uq_wallet_tx_source_ref',
        columnNames: ['source', 'external_reference'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'wallet_transaction_history',
      new TableIndex({
        name: 'uq_wallet_tx_gateway_charge_id',
        columnNames: ['gateway_charge_id'],
        isUnique: true,
      }),
    );

    // ---------- deposit_webhook_log ----------
    await queryRunner.createTable(
      new Table({
        name: 'deposit_webhook_log',
        columns: [
          { name: 'id', ...pk },
          { name: 'source', type: 'varchar', length: '100' },
          { name: 'payload', type: 'text' },
          {
            name: 'wallet_transaction_id',
            type: 'int',
            isNullable: true,
          },
          { name: 'created_at', type: timestampType, default: nowDefault },
        ],
        foreignKeys: [
          {
            columnNames: ['wallet_transaction_id'],
            referencedTableName: 'wallet_transaction_history',
            referencedColumnNames: ['id'],
          },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'deposit_webhook_log',
      new TableIndex({
        name: 'idx_deposit_log_tx',
        columnNames: ['wallet_transaction_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('deposit_webhook_log', true);
    await queryRunner.dropTable('wallet_transaction_history', true);
    await queryRunner.dropTable('wallet', true);
  }
}
