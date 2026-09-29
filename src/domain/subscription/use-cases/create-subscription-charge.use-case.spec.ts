import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateSubscriptionChargeUseCase } from './create-subscription-charge.use-case';
import { PlanModel } from '@domain/subscription/models/plan.model';
import { SubscriptionModel } from '@domain/subscription/models/subscription.model';
import { SubscriptionPaymentModel } from '@domain/subscription/models/subscription-payment.model';
import { SubscriptionStatusEnum } from '@domain/shared/enums/subscription-status.enum';
import { SubscriptionPaymentStatusEnum } from '@domain/shared/enums/subscription-payment-status.enum';

describe('CreateSubscriptionChargeUseCase', () => {
  let useCase: CreateSubscriptionChargeUseCase;
  let paymentGateway: { createCharge: jest.Mock };
  let transactionManager: { runInTransaction: jest.Mock };
  let planRepository: { findById: jest.Mock };
  let subscriptionRepository: {
    findBySourceAndExternalId: jest.Mock;
    create: jest.Mock;
  };
  let paymentRepository: { create: jest.Mock };

  const plan = new PlanModel({
    id: 1,
    name: 'Mensal',
    amount: 4990,
    currency: 'BRL',
    intervalDays: 30,
    active: true,
  });

  beforeEach(() => {
    paymentGateway = {
      createCharge: jest.fn().mockResolvedValue({
        gatewayChargeId: 'stub_charge_1',
        qrCodePayload: 'PIX-PAYLOAD',
      }),
    };
    transactionManager = { runInTransaction: jest.fn((w) => w({})) };
    planRepository = { findById: jest.fn().mockResolvedValue(plan) };
    subscriptionRepository = {
      findBySourceAndExternalId: jest.fn().mockResolvedValue(null),
      create: jest.fn((m) =>
        Promise.resolve(new SubscriptionModel({ ...m, id: 7 })),
      ),
    };
    paymentRepository = {
      create: jest.fn((m) =>
        Promise.resolve(new SubscriptionPaymentModel({ ...m, id: 20 })),
      ),
    };

    useCase = new CreateSubscriptionChargeUseCase(
      paymentGateway as any,
      transactionManager as any,
      planRepository as any,
      subscriptionRepository as any,
      paymentRepository as any,
    );
  });

  it('cria assinatura PENDING e cobrança PENDING com o valor do plano', async () => {
    const result = await useCase.execute({
      source: 'saas-a',
      externalId: 'cli-123',
      planId: 1,
    });

    // Assinatura criada como PENDING (sem vencimento ainda).
    const createdSub = subscriptionRepository.create.mock.calls[0][0];
    expect(createdSub.status).toBe(SubscriptionStatusEnum.PENDING);
    expect(createdSub.currentPeriodEnd).toBeNull();

    // Cobrança no gateway com o valor do plano.
    expect(paymentGateway.createCharge).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'saas-a', amount: 4990 }),
    );

    // Cobrança registrada como PENDING vinculada à assinatura.
    const createdPayment = paymentRepository.create.mock.calls[0][0];
    expect(createdPayment.status).toBe(SubscriptionPaymentStatusEnum.PENDING);
    expect(createdPayment.subscriptionId).toBe(7);
    expect(createdPayment.amount).toBe(4990);
    expect(createdPayment.gatewayChargeId).toBe('stub_charge_1');

    expect(result.subscription.id).toBe(7);
    expect(result.payment.id).toBe(20);
    expect(result.charge.gatewayChargeId).toBe('stub_charge_1');
  });

  it('reutiliza assinatura existente (idempotência por source+externalId)', async () => {
    subscriptionRepository.findBySourceAndExternalId.mockResolvedValue(
      new SubscriptionModel({
        id: 99,
        source: 'saas-a',
        externalId: 'cli-123',
        planId: 1,
        status: SubscriptionStatusEnum.ACTIVE,
        currentPeriodEnd: new Date('2026-03-01T00:00:00Z'),
        extendedDays: 0,
      }),
    );

    const result = await useCase.execute({
      source: 'saas-a',
      externalId: 'cli-123',
      planId: 1,
    });

    // Não cria outra assinatura; gera nova cobrança para a existente.
    expect(subscriptionRepository.create).not.toHaveBeenCalled();
    expect(result.subscription.id).toBe(99);
    expect(paymentRepository.create.mock.calls[0][0].subscriptionId).toBe(99);
  });

  it('lança 404 quando o plano não existe', async () => {
    planRepository.findById.mockResolvedValue(null);
    await expect(
      useCase.execute({ source: 'saas-a', externalId: 'x', planId: 999 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(paymentGateway.createCharge).not.toHaveBeenCalled();
  });

  it('rejeita plano inativo', async () => {
    planRepository.findById.mockResolvedValue(
      new PlanModel({ ...plan, active: false }),
    );
    await expect(
      useCase.execute({ source: 'saas-a', externalId: 'x', planId: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(paymentGateway.createCharge).not.toHaveBeenCalled();
  });
});
