import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration corretiva do modelo de assinatura (colapso para modelo coeso A1).
 *
 * Bancos já migrados com o modelo antigo (tabelas `plan`, `subscription` e
 * `subscription_payment` com FK para subscription) são ajustados aqui:
 *   - dropa `plan` e `subscription` (não são mais usadas — a fonte da verdade
 *     da assinatura é o `customers`, gerido pelo front);
 *   - reconstrói `subscription_payment` no novo formato (referencia o cliente
 *     por source+external_id, com amount+interval_days, sem FK).
 *
 * Idempotente e segura para banco novo: usa DROP ... IF EXISTS. Num banco novo
 * a `InitSubscriptions` já criou a tabela nova; aqui ela é apenas recriada
 * identicamente (sem perda, pois cobranças pendentes são efêmeras).
 */
export class RemodelSubscription1730001000000 implements MigrationInterface {
  name = 'RemodelSubscription1730001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    const timestampType = isPostgres ? 'timestamp' : 'datetime';
    const nowDefault = isPostgres ? 'now()' : 'CURRENT_TIMESTAMP';

    // Remove a tabela de cobrança antiga (tinha subscription_id + FK) e as
    // tabelas plan/subscription, agora inexistentes no modelo.
    await queryRunner.query('DROP TABLE IF EXISTS "subscription_payment"');
    await queryRunner.query('DROP TABLE IF EXISTS "subscription"');
    await queryRunner.query('DROP TABLE IF EXISTS "plan"');

    // Recria subscription_payment no novo formato.
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
    // Não recria plan/subscription (modelo abandonado). Apenas remove a tabela
    // de cobrança — o estado anterior exato não é reproduzível.
    await queryRunner.query('DROP TABLE IF EXISTS "subscription_payment"');
  }
}
