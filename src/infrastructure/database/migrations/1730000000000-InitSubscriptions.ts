import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration da tabela de cobranças de assinatura: `subscription_payment`.
 *
 * Modelo coeso (fonte da verdade da assinatura é o `customers`, gerido pelo
 * front). Esta tabela guarda apenas as cobranças do gateway e as concilia via
 * webhook, referenciando o cliente por (source, external_id) — sem tabelas
 * `plan`/`subscription` e sem FK (o cliente vive em base gerida pelo front).
 *
 * Idempotência: índice único em `gateway_charge_id`.
 */
export class InitSubscriptions1730000000000 implements MigrationInterface {
  name = 'InitSubscriptions1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    const timestampType = isPostgres ? 'timestamp' : 'datetime';
    const nowDefault = isPostgres ? 'now()' : 'CURRENT_TIMESTAMP';

    await queryRunner.createTable(
      new Table({
        name: 'subscription_payment',
        columns: [
          {
            name: 'id',
            type: isPostgres ? 'int' : 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'source', type: 'varchar', length: '100' },
          { name: 'external_id', type: 'varchar', length: '255' },
          { name: 'amount', type: 'bigint' },
          { name: 'interval_days', type: 'int' },
          { name: 'gateway_charge_id', type: 'varchar', length: '255' },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          { name: 'paid_period_end', type: timestampType, isNullable: true },
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
    await queryRunner.createIndex(
      'subscription_payment',
      new TableIndex({
        name: 'idx_subscription_payment_customer',
        columnNames: ['source', 'external_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('subscription_payment', true);
  }
}
