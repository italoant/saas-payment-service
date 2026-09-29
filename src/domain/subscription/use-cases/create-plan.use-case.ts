import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PLAN_REPOSITORY } from '@domain/shared/ports/tokens';
import { PlanRepositoryPort } from '@domain/subscription/ports/plan-repository.port';
import { PlanModel } from '@domain/subscription/models/plan.model';
import { CreatePlanCommand } from './create-plan.command';

/**
 * Registra um plano genérico de assinatura (valor recorrente + intervalo de
 * renovação em dias). Planos são reutilizáveis por qualquer SaaS.
 */
@Injectable()
export class CreatePlanUseCase {
  private readonly logger = new Logger(CreatePlanUseCase.name);

  constructor(
    @Inject(PLAN_REPOSITORY)
    private readonly planRepository: PlanRepositoryPort,
  ) {}

  async execute(command: CreatePlanCommand): Promise<PlanModel> {
    const name = command.name?.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }
    if (!Number.isInteger(command.amount) || command.amount <= 0) {
      throw new BadRequestException(
        'amount must be a positive integer (cents)',
      );
    }
    if (!Number.isInteger(command.intervalDays) || command.intervalDays <= 0) {
      throw new BadRequestException(
        'intervalDays must be a positive integer (days)',
      );
    }

    const plan = await this.planRepository.create(
      new PlanModel({
        name,
        description: command.description?.trim() || undefined,
        amount: command.amount,
        currency: command.currency?.trim() || 'BRL',
        intervalDays: command.intervalDays,
        active: true,
      }),
    );

    this.logger.log(
      `[CreatePlan] id=${plan.id} name=${plan.name} amount=${plan.amount} intervalDays=${plan.intervalDays}`,
    );
    return plan;
  }

  /** Lista todos os planos cadastrados. */
  async list(): Promise<PlanModel[]> {
    return this.planRepository.findAll();
  }
}
