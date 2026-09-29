import { BadRequestException } from '@nestjs/common';
import { CreateSubscriptionChargeUseCase } from './create-subscription-charge.use-case';
import { SubscriptionPaymentModel } from '@domain/subscription/models/subscription-payment.model';
import { SubscriptionPaymentStatusEnum } from '@domain/shared/enums/subscription-payment-status.enum';

describe('CreateSubscriptionChargeUseCase', () => {
  let useCase: CreateSubscriptionChargeUseCase;
  let paymentGateway: { createCharge: jest.Mock };
  let paymentRepository: { create: jest.Mock };

  beforeEach(() => {
    paymentGateway = {
      createCharge: jest.fn().mockResolvedValue({
        gatewayChargeId: 'stub_charge_1',
        qrCodePayload: 'PIX-PAYLOAD',
      }),
    };
    paymentRepository = {
      create: jest.fn((m) =>
        Promise.resolve(new SubscriptionPaymentModel({ ...m, id: 20 })),
      ),
    };

    useCase = new CreateSubscriptionChargeUseCase(
      paymentGateway as any,
      paymentRepository as any,
    );
  });

  it('gera cobrança no gateway e registra PENDING para o cliente', async () => {
    const result = await useCase.execute({
      source: 'saas-a',
      externalId: 'cli-123',
      amount: 4990,
    });

    // Cobrança no gateway com o valor informado e referência do cliente.
    expect(paymentGateway.createCharge).toHaveBeenCalledWith({
      source: 'saas-a',
      amount: 4990,
      externalReference: 'saas-a:cli-123',
    });

    // Cobrança registrada como PENDING, intervalo default 30, sem período pago.
    const created = paymentRepository.create.mock.calls[0][0];
    expect(created.status).toBe(SubscriptionPaymentStatusEnum.PENDING);
    expect(created.externalId).toBe('cli-123');
    expect(created.amount).toBe(4990);
    expect(created.intervalDays).toBe(30);
    expect(created.paidPeriodEnd).toBeNull();

    expect(result.payment.id).toBe(20);
    expect(result.charge.gatewayChargeId).toBe('stub_charge_1');
  });

  it('respeita intervalDays customizado', async () => {
    await useCase.execute({
      source: 'saas-a',
      externalId: 'cli-1',
      amount: 1000,
      intervalDays: 7,
    });
    expect(paymentRepository.create.mock.calls[0][0].intervalDays).toBe(7);
  });

  it('rejeita externalId vazio', async () => {
    await expect(
      useCase.execute({ source: 'saas-a', externalId: '  ', amount: 1000 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(paymentGateway.createCharge).not.toHaveBeenCalled();
  });

  it('rejeita amount não positivo', async () => {
    await expect(
      useCase.execute({ source: 'saas-a', externalId: 'cli-1', amount: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(paymentGateway.createCharge).not.toHaveBeenCalled();
  });

  it('rejeita amount não inteiro', async () => {
    await expect(
      useCase.execute({ source: 'saas-a', externalId: 'cli-1', amount: 10.5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
