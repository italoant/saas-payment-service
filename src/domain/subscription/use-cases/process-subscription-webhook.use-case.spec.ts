import { NotFoundException } from '@nestjs/common';
import { ProcessSubscriptionWebhookUseCase } from './process-subscription-webhook.use-case';
import { PlanModel } from '@domain/subscription/models/plan.model';
import { SubscriptionModel } from '@domain/subscription/models/subscription.model';
import { SubscriptionPaymentModel } from '@domain/subscription/models/subscription-payment.model';
import { SubscriptionStatusEnum } from '@domain/shared/enums/subscription-status.enum';
import { SubscriptionPaymentStatusEnum } from '@domain/shared/enums/subscription-payment-status.enum';

describe('ProcessSubscriptionWebhookUseCase', () => {
  let useCase: ProcessSubscriptionWebhookUseCase;
  let transactionManager: { runInTransaction: jest.Mock };
  let planRepository: { findById: jest.Mock };
  let subscriptionRepository: {
    findById: jest.Mock;
    updatePeriod: jest.Mock;
  };
  let paymentRepository: {
    findByGatewayChargeId: jest.Mock;
    updateSettlement: jest.Mock;
  };

  const plan = new PlanModel({ id: 1, intervalDays: 30, amount: 4990, active: true });

  const pendingPayment = () =>
    new SubscriptionPaymentModel({
      id: 20,
      subscriptionId: 7,
      source: 'saas-a',
      amount: 4990,
      gatewayChargeId: 'stub_charge_1',
      status: SubscriptionPaymentStatusEnum.PENDING,
    });

  const pendingSubscription = () =>
    new SubscriptionModel({
      id: 7,
      source: 'saas-a',
      externalId: 'cli-123',
      planId: 1,
      status: SubscriptionStatusEnum.PENDING,
      currentPeriodEnd: null,
      extendedDays: 0,
    });

  beforeEach(() => {
    transactionManager = { runInTransaction: jest.fn((w) => w({})) };
    planRepository = { findById: jest.fn().mockResolvedValue(plan) };
    subscriptionRepository = {
      findById: jest.fn().mockResolvedValue(pendingSubscription()),
      updatePeriod: jest.fn((id, data) =>
        Promise.resolve(
          new SubscriptionModel({ ...pendingSubscription(), ...data, id }),
        ),
      ),
    };
    paymentRepository = {
      findByGatewayChargeId: jest.fn().mockResolvedValue(pendingPayment()),
      updateSettlement: jest.fn((id, data) =>
        Promise.resolve(
          new SubscriptionPaymentModel({ ...pendingPayment(), ...data, id }),
        ),
      ),
    };

    useCase = new ProcessSubscriptionWebhookUseCase(
      transactionManager as any,
      planRepository as any,
      subscriptionRepository as any,
      paymentRepository as any,
    );
  });

  it('confirma o pagamento: ativa a assinatura e prorroga o vencimento', async () => {
    const result = await useCase.execute({
      gatewayChargeId: 'stub_charge_1',
      status: 'paid',
      rawPayload: { id: 'stub_charge_1', status: 'paid' },
    });

    // Assinatura vira ACTIVE com vencimento ~30 dias à frente.
    const periodArgs = subscriptionRepository.updatePeriod.mock.calls[0];
    expect(periodArgs[0]).toBe(7);
    expect(periodArgs[1].status).toBe(SubscriptionStatusEnum.ACTIVE);
    expect(periodArgs[1].extendedDays).toBe(0);
    const newEnd: Date = periodArgs[1].currentPeriodEnd;
    const diffDays = Math.round(
      (newEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
    );
    expect(diffDays).toBe(30);

    // Cobrança marcada como PAID com o período coberto.
    const settleArgs = paymentRepository.updateSettlement.mock.calls[0];
    expect(settleArgs[0]).toBe(20);
    expect(settleArgs[1].status).toBe(SubscriptionPaymentStatusEnum.PAID);
    expect(settleArgs[1].periodEnd).toEqual(newEnd);

    expect(result.status).toBe(SubscriptionStatusEnum.ACTIVE);
  });

  it('assume confirmação quando o status não é informado', async () => {
    await useCase.execute({
      gatewayChargeId: 'stub_charge_1',
      rawPayload: {},
    });
    expect(subscriptionRepository.updatePeriod).toHaveBeenCalled();
  });

  it('lança 404 quando não há cobrança para o gatewayChargeId', async () => {
    paymentRepository.findByGatewayChargeId.mockResolvedValue(null);
    await expect(
      useCase.execute({ gatewayChargeId: 'desconhecido', rawPayload: {} }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(subscriptionRepository.updatePeriod).not.toHaveBeenCalled();
  });

  it('não prorroga e marca FAILED quando o status não é de pagamento', async () => {
    const result = await useCase.execute({
      gatewayChargeId: 'stub_charge_1',
      status: 'expired',
      rawPayload: {},
    });

    expect(subscriptionRepository.updatePeriod).not.toHaveBeenCalled();
    const settleArgs = paymentRepository.updateSettlement.mock.calls[0];
    expect(settleArgs[1].status).toBe(SubscriptionPaymentStatusEnum.FAILED);
    // Retorna a assinatura como estava (PENDING).
    expect(result.status).toBe(SubscriptionStatusEnum.PENDING);
  });

  it('é idempotente: não prorroga de novo se a cobrança já está PAID', async () => {
    paymentRepository.findByGatewayChargeId.mockResolvedValue(
      new SubscriptionPaymentModel({
        ...pendingPayment(),
        status: SubscriptionPaymentStatusEnum.PAID,
      }),
    );

    await useCase.execute({
      gatewayChargeId: 'stub_charge_1',
      status: 'paid',
      rawPayload: {},
    });

    expect(subscriptionRepository.updatePeriod).not.toHaveBeenCalled();
    expect(paymentRepository.updateSettlement).not.toHaveBeenCalled();
  });

  it('renovação em dia estende a partir do vencimento vigente', async () => {
    const futureEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    subscriptionRepository.findById.mockResolvedValue(
      new SubscriptionModel({
        ...pendingSubscription(),
        status: SubscriptionStatusEnum.ACTIVE,
        currentPeriodEnd: futureEnd,
      }),
    );

    await useCase.execute({
      gatewayChargeId: 'stub_charge_1',
      status: 'paid',
      rawPayload: {},
    });

    const newEnd: Date =
      subscriptionRepository.updatePeriod.mock.calls[0][1].currentPeriodEnd;
    // 10 dias restantes + 30 do plano = ~40 dias à frente.
    const diffDays = Math.round(
      (newEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
    );
    expect(diffDays).toBe(40);
  });
});
