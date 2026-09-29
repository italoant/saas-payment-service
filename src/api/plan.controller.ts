import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreatePlanUseCase } from '@domain/subscription/use-cases/create-plan.use-case';
import { CreatePlanDto } from './dtos/create-plan.dto';

/**
 * Gerencia planos genéricos de assinatura (valor recorrente + intervalo).
 */
@ApiTags('Plans')
@Controller('plans')
export class PlanController {
  private readonly logger = new Logger(PlanController.name);

  constructor(private readonly createPlan: CreatePlanUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra um plano de assinatura' })
  async create(@Body() body: CreatePlanDto) {
    this.logger.log(`[Plan] create body=${JSON.stringify(body)}`);
    const plan = await this.createPlan.execute({
      name: body.name,
      description: body.description,
      amount: body.amount,
      currency: body.currency,
      intervalDays: body.intervalDays,
    });
    return plan;
  }

  @Get()
  @ApiOperation({ summary: 'Lista os planos cadastrados' })
  async list() {
    return this.createPlan.list();
  }
}
