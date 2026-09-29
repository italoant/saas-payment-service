/**
 * Model de domínio de um Plano de assinatura.
 *
 * Um plano é genérico e reutilizável entre os SaaS: define o valor recorrente
 * (em centavos) e o intervalo de renovação em dias (ex.: 30 = mensal). Model
 * puro — a entidade TypeORM correspondente vive na infraestrutura.
 */
export class PlanModel {
  id: number;
  /** Nome do plano (ex.: "Mensal", "Anual"). */
  name: string;
  /** Descrição opcional. */
  description?: string;
  /** Valor recorrente do plano, em centavos (inteiro positivo). */
  amount: number;
  /** Moeda ISO 4217 (ex.: BRL). */
  currency: string;
  /**
   * Intervalo de renovação em dias. Cada pagamento confirmado prorroga a
   * assinatura por este número de dias (ex.: 30 = mensal).
   */
  intervalDays: number;
  /** Se o plano está disponível para novas assinaturas. */
  active: boolean;
  createdAt?: Date;

  constructor(partial: Partial<PlanModel>) {
    Object.assign(this, partial);
  }
}
