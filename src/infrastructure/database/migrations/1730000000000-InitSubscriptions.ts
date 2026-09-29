import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration inicial do domínio de assinaturas: cria as tabelas `plan`,
 * `subscription` e `subscription_payment`.
 *
 * Usa a API `Table`/`TableIndex` do TypeORM (agnóstica de dialeto): os tipos
 * são resolvidos para o banco em uso (sqlite em dev/testes, postgres em
 * produção). Idempotência garantida por índices únicos:
 *   - subscription: (source, external_id)
 *   - subscription_payment: gateway_charge_id
 */
export class InitSubscriptions1730000000000 implements MigrationInterface {
  name = 'InitSubscriptions1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    // Tipo de PK auto-incremento portável.
    const pk = isPostgres
      ? { type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' as const }
      : { type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' as const };
    const timestampType = isPostgres ? 'timestamp' : 'datetime';
    const boolType = isPostgres ? 'boolean' : 'boolean';
    const nowDefault = isPostgres ? 'now()' : 'CURRENT_TIMESTAMP';

    // ---------- plan ----------
    await queryRunner.createTable(
      new Table({
        name: 'plan',
        columns: [
          { name: 'id', ...pk },
          { name: 'name', type: 'varchar', length: '100' },
          { name: 'description', type: 'varchar', length: '255', isNullable: true },
          { name: 'amount', type: 'bigint' },
          { name: 'currency', type: 'varchar', length: '3', default: "'BRL'" },
          { name: 'interval_days', type: 'int' },
          { name: 'active', type: boolType, default: true },
          { name: 'created_at', type: timestampType, default: nowDefault },
        ],
      }),
      true,
    );

    // ---------- subscription ----------
    await queryRunner.createTable(
      new Table({
        name: 'subscription',
        columns: [
          { name: 'id', ...pk },
          { name: 'source', type: 'varchar', length: '100' },
          { name: 'external_id', type: 'varchar', length: '255' },
          { name: 'plan_id', type: 'int' },
          { name: 'status', type: 'varchar', length: '20', default: "'pending'" },
          { name: 'current_period_end', type: timestampType, isNullable: true },
          { name: 'extended_days', type: 'int', default: 0 },
          { name: 'created_at', type: timestampType, default: nowDefault },
          { name: 'updated_at', type: timestampType, default: nowDefault },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'subscription',
      new TableIndex({
        name: 'uq_subscription_source_external_id',
        columnNames: ['source', 'external_id'],
        isUnique: true,
      }),
    );

    // ---------- subscription_payment ----------
    await queryRunner.createTable(
      new Table({
        name: 'subscription_payment',
        columns: [
          { name: 'id', ...pk },
          { name: 'subscription_id', type: 'int' },
          { name: 'source', type: 'varchar', length: '100' },
          { name: 'amount', type: 'bigint' },
          { name: 'gateway_charge_id', type: 'varchar', length: '255' },
          { name: 'status', type: 'varchar', length: '20', default: "'pending'" },
          { name: 'period_end', type: timestampType, isNullable: true },
          { name: 'created_at', type: timestampType, default: nowDefault },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'subscription_payment',
      new TableIndex({
        name: 'uq_subscription_payment_gateway_charge_id',
        columnNames: ['gateway_charge_id'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('subscription_payment', true);
    await queryRunner.dropTable('subscription', true);
    await queryRunner.dropTable('plan', true);
  }
}
