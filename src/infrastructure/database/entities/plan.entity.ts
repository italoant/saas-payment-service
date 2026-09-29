import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Entidade TypeORM de Plano. Tabela `plan`.
 *
 * Plano genérico reutilizável entre SaaS: valor recorrente (centavos) e
 * intervalo de renovação em dias. Tipos deixados portáveis entre bancos.
 */
@Entity('plan')
export class PlanEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  /** Valor recorrente do plano, em centavos. */
  @Column({ type: 'bigint' })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'BRL' })
  currency: string;

  /** Intervalo de renovação em dias (ex.: 30 = mensal). */
  @Column({ name: 'interval_days', type: 'int' })
  intervalDays: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
