import { NotFoundException } from '@nestjs/common';
import { ProcessDepositWebhookUseCase } from './process-deposit-webhook.use-case';
import { TransactionStatusEnum } from '@domain/shared/enums/transaction-status.enum';
import { WalletTransactionHistoryModel } from '@domain/wallet/models/wallet-transaction-history.model';
import { WalletModel } from '@domain/wallet/models/wallet.model';
import { DepositWebhookLogModel } from '@domain/deposit/models/deposit-webhook-log.model';

describe('ProcessDepositWebhookUseCase', () => {
  let useCase: ProcessDepositWebhookUseCase;
  let transactionManager: { runInTransaction: jest.Mock };
  let walletRepository: { getOrCreate: jest.Mock; updateBalance: jest.Mock };
  let transactionRepository: {
    findByGatewayChargeId: jest.Mock;
    updateSettlement: jest.Mock;
  };
  let webhookLogRepository: {
    create: jest.Mock;
    linkToTransaction: jest.Mock;
  };
  let configService: { get: jest.Mock };

  const wallet = new WalletModel({
    walletId: 1,
    balance: 5000,
    currency: 'BRL',
  });

  const pendingTx = () =>
    new WalletTransactionHistoryModel({
      id: 10,
      walletId: 1,
      source: 'saas-a',
      amount: 10050,
      previousBalance: 5000,
      newBalance: 5000,
      gatewayChargeId: 'stub_charge_1',
      status: TransactionStatusEnum.PENDING,
    });

  beforeEach(() => {
    transactionManager = {
      runInTransaction: jest.fn((work) => work({})),
    };
    walletRepository = {
      getOrCreate: jest.fn().mockResolvedValue(wallet),
      updateBalance: jest.fn(),
    };
    transactionRepository = {
      findByGatewayChargeId: jest.fn().mockResolvedValue(pendingTx()),
      updateSettlement: jest.fn((id, data) =>
        Promise.resolve(
          new WalletTransactionHistoryModel({
            ...pendingTx(),
            ...data,
            id,
          }),
        ),
      ),
    };
    webhookLogRepository = {
      create: jest
        .fn()
        .mockResolvedValue(new DepositWebhookLogModel({ id: 1 })),
      linkToTransaction: jest.fn(),
    };
    configService = { get: jest.fn().mockReturnValue('BRL') };

    useCase = new ProcessDepositWebhookUseCase(
      transactionManager as any,
      walletRepository as any,
      transactionRepository as any,
      webhookLogRepository as any,
      configService as any,
    );
  });

  it('confirma o depósito: credita o saldo e move PENDING -> COMPLETED', async () => {
    const result = await useCase.execute({
      gatewayChargeId: 'stub_charge_1',
      status: 'paid',
      rawPayload: { id: 'stub_charge_1', status: 'paid' },
    });

    // Credita: saldo anterior 5000 + amount 10050 = 15050.
    expect(walletRepository.updateBalance).toHaveBeenCalledWith(1, 15050, {});
    const settleArgs = transactionRepository.updateSettlement.mock.calls[0];
    expect(settleArgs[0]).toBe(10);
    expect(settleArgs[1]).toEqual({
      status: TransactionStatusEnum.COMPLETED,
      previousBalance: 5000,
      newBalance: 15050,
    });

    expect(result.status).toBe(TransactionStatusEnum.COMPLETED);
    expect(result.newBalance).toBe(15050);
    // O log é gravado com o source descoberto pela transação.
    expect(webhookLogRepository.create).toHaveBeenCalled();
    const loggedModel = webhookLogRepository.create.mock.calls[0][0];
    expect(loggedModel.source).toBe('saas-a');
    expect(webhookLogRepository.linkToTransaction).toHaveBeenCalledWith(1, 10);
  });

  it('assume confirmação quando o status não é informado', async () => {
    await useCase.execute({
      gatewayChargeId: 'stub_charge_1',
      rawPayload: {},
    });
    expect(walletRepository.updateBalance).toHaveBeenCalledWith(1, 15050, {});
  });

  it('lança 404 quando não há transação para o gatewayChargeId', async () => {
    transactionRepository.findByGatewayChargeId.mockResolvedValue(null);

    await expect(
      useCase.execute({ gatewayChargeId: 'desconhecido', rawPayload: {} }),
    ).rejects.toBeInstanceOf(NotFoundException);

    // O log é gravado mesmo assim (auditoria), com source '-'.
    expect(webhookLogRepository.create).toHaveBeenCalled();
    expect(webhookLogRepository.create.mock.calls[0][0].source).toBe('-');
    // Não credita.
    expect(walletRepository.updateBalance).not.toHaveBeenCalled();
  });

  it('não credita quando o status não é de pagamento confirmado', async () => {
    const result = await useCase.execute({
      gatewayChargeId: 'stub_charge_1',
      status: 'failed',
      rawPayload: {},
    });

    expect(walletRepository.updateBalance).not.toHaveBeenCalled();
    expect(transactionRepository.updateSettlement).not.toHaveBeenCalled();
    // Retorna a transação como está (ainda PENDING) e vincula o log.
    expect(result.status).toBe(TransactionStatusEnum.PENDING);
    expect(webhookLogRepository.linkToTransaction).toHaveBeenCalledWith(1, 10);
  });

  it('é idempotente: não credita de novo se a transação já está COMPLETED', async () => {
    transactionRepository.findByGatewayChargeId.mockResolvedValue(
      new WalletTransactionHistoryModel({
        ...pendingTx(),
        status: TransactionStatusEnum.COMPLETED,
      }),
    );

    const result = await useCase.execute({
      gatewayChargeId: 'stub_charge_1',
      status: 'paid',
      rawPayload: {},
    });

    expect(walletRepository.updateBalance).not.toHaveBeenCalled();
    expect(transactionRepository.updateSettlement).not.toHaveBeenCalled();
    expect(result.status).toBe(TransactionStatusEnum.COMPLETED);
  });

  it('reconhece variações de status confirmado (case-insensitive)', async () => {
    await useCase.execute({
      gatewayChargeId: 'stub_charge_1',
      status: '  APPROVED ',
      rawPayload: {},
    });
    expect(walletRepository.updateBalance).toHaveBeenCalled();
  });
});
