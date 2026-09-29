import { NotFoundException } from '@nestjs/common';
import { ProcessSubscriptionWebhookUseCase } from './process-subscription-webhook.use-case';
import { SubscriptionPaymentModel } from '@domain/subscription/models/subscription-payment.model';
import { CustomerSubscriptionModel } from '@domain/subscription/models/customer-subscription.model';
import { SubscriptionPaymentStatusEnum } from '@domain/shared/enums/subscription-payment-status.enum';

describe('ProcessSubscriptionWebhookUseCase', () => {
  let useCase: ProcessSubscriptionWebhookUseCase;
  let transactionManager: { runInTransaction: jest.Mock };
  let paymentRepository: {
    findByGatewayChargeId: jest.Mock;
    updateSettlement: jest.Mock;
  };
  let customerRepository: { findById: jest.Mock; markPaid: jest.Mock };

  const pendingPayment = (overrides = {}) =>
    new SubscriptionPaymentModel({
      id: 20,
      source: 'saas-a',
      externalId: 'cli-123',
      amount: 4990,
      intervalDays: 30,
      gatewayChargeId: 'stub_charge_1',
      status: SubscriptionPaymentStatusEnum.PENDING,
      ...overrides,
    });

  beforeEach(() => {
    transactionManager = { runInTransaction: jest.fn((w) => w({})) };
    paymentRepository = {
      findByGatewayChargeId: jest.fn().mockResolvedValue(pendingPayment()),
      updateSettlement: jest.fn().mockResolvedValue(undefined),
    };
    customerRepository = {
      findById: jest.fn().mockResolvedValue(
        new CustomerSubscriptionModel({
          id: 'cli-123',
          subStatus: 'devendo',
          subDueDate: null,
        }),
      ),
      markPaid: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new ProcessSubscriptionWebhookUseCase(
      transactionManager as any,
      paymentRepository as any,
      customerRepository as any,
    );
  });

  it('confirma pagamento: marca cliente pago e prorroga +30 dias', async () => {
    const result = await useCase.execute({
      gatewayChargeId: 'stub_charge_1',
      status: 'paid',
      rawPayload: { id: 'stub_charge_1', status: 'paid' },
    });

    // Cliente prorrogado ~30 dias a partir de agora (sem vencimento anterior).
    const [custId, newDue] = customerRepository.markPaid.mock.calls[0];
    expect(custId).toBe('cli-123');
    const diffDays = Math.round(
      (newDue.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
    );
    expect(diffDays).toBe(30);

    // Cobrança confirmada como PAID com o período aplicado.
    const settle = paymentRepository.updateSettlement.mock.calls[0];
    expect(settle[0]).toBe(20);
    expect(settle[1].status).toBe(SubscriptionPaymentStatusEnum.PAID);

    expect(result.status).toBe(SubscriptionPaymentStatusEnum.PAID);
    expect(result.customerId).toBe('cli-123');
  });

  it('renovação em dia estende a partir do vencimento vigente', async () => {
    const futureDue = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    customerRepository.findById.mockResolvedValue(
      new CustomerSubscriptionModel({
        id: 'cli-123',
        subStatus: 'pago',
        subDueDate: futureDue.toISOString(),
      }),
    );

    await useCase.execute({
      gatewayChargeId: 'stub_charge_1',
      status: 'paid',
      rawPayload: {},
    });

    const newDue: Date = customerRepository.markPaid.mock.calls[0][1];
    const diffDays = Math.round(
      (newDue.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
    );
    // 10 restantes + 30 do intervalo = ~40.
    expect(diffDays).toBe(40);
  });

  it('assume confirmação quando não há status', async () => {
    await useCase.execute({ gatewayChargeId: 'stub_charge_1', rawPayload: {} });
    expect(customerRepository.markPaid).toHaveBeenCalled();
  });

  it('lança 404 quando não há cobrança para o gatewayChargeId', async () => {
    paymentRepository.findByGatewayChargeId.mockResolvedValue(null);
    await expect(
      useCase.execute({ gatewayChargeId: 'x', rawPayload: {} }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(customerRepository.markPaid).not.toHaveBeenCalled();
  });

  it('lança 404 quando o cliente não existe', async () => {
    customerRepository.findById.mockResolvedValue(null);
    await expect(
      useCase.execute({ gatewayChargeId: 'stub_charge_1', status: 'paid', rawPayload: {} }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(customerRepository.markPaid).not.toHaveBeenCalled();
  });

  it('não prorroga e marca FAILED quando status não é de pagamento', async () => {
    const result = await useCase.execute({
      gatewayChargeId: 'stub_charge_1',
      status: 'expired',
      rawPayload: {},
    });
    expect(customerRepository.markPaid).not.toHaveBeenCalled();
    expect(paymentRepository.updateSettlement.mock.calls[0][1].status).toBe(
      SubscriptionPaymentStatusEnum.FAILED,
    );
    expect(result.status).toBe(SubscriptionPaymentStatusEnum.FAILED);
  });

  it('é idempotente: cobrança já PAID não prorroga de novo', async () => {
    paymentRepository.findByGatewayChargeId.mockResolvedValue(
      pendingPayment({ status: SubscriptionPaymentStatusEnum.PAID }),
    );
    const result = await useCase.execute({
      gatewayChargeId: 'stub_charge_1',
      status: 'paid',
      rawPayload: {},
    });
    expect(customerRepository.markPaid).not.toHaveBeenCalled();
    expect(customerRepository.findById).not.toHaveBeenCalled();
    expect(result.status).toBe(SubscriptionPaymentStatusEnum.PAID);
  });
});
