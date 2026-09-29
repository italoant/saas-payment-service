import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Entidade TypeORM da wallet. Mapeada para a tabela `wallet`.
 *
 * Tipos de coluna deixados no padrão do TypeORM (`int`, `varchar`, timestamps)
 * para serem portáveis entre bancos — quando você escolher o banco, o TypeORM
 * gera a migration com os tipos nativos equivalentes.
 */
@Entity('wallet')
export class WalletEntity {
  @PrimaryGeneratedColumn({ name: 'wallet_id' })
  walletId: number;

  /** Saldo atual em centavos. */
  @Column({ type: 'bigint', default: 0 })
  balance: number;

  @Column({ type: 'varchar', length: 3, default: 'BRL' })
  currency: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
