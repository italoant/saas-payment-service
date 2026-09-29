import { BadRequestException } from '@nestjs/common';
import { CreateDepositUseCase } from './create-deposit.use-case';
import { TransactionStatusEnum } from '@domain/shared/enums/transaction-status.enum';
import { WalletTransactionHistoryModel } from '@domain/wallet/models/wallet-transaction-history.model';
import { WalletModel } from '@domain/wallet/models/wallet.model';

describe('CreateDepositUseCase', () => {
  let useCase: CreateDepositUseCase;
  let paymentGateway: { createCharge: jest.Mock };
  let transactionManager: { runInTransaction: jest.Mock };
  let walletRepository: { getOrCreate: jest.Mock; updateBalance: jest.Mock };
  let transactionRepository: {
    create: jest.Mock;
    findByExternalReference: jest.Mock;
    findByGatewayChargeId: jest.Mock;
    updateSettlement: jest.Mock;
  };
  let configService: { get: jest.Mock };

  const wallet = new WalletModel({
    walletId: 1,
    balance: 5000,
    currency: 'BRL',
  });

  beforeEach(() => {
    paymentGateway = {
      createCharge: jest.fn().mockResolvedValue({
        gatewayChargeId: 'stub_charge_1',
        qrCodePayload: 'PIX-PAYLOAD',
        expiresAt: new Date('2030-01-01T00:00:00Z'),
      }),
    };
    // Executa o callback passando um ctx fake, como faria o manager real.
    transactionManager = {
      runInTransaction: jest.fn((work) => work({})),
    };
    walletRepository = {
      getOrCreate: jest.fn().mockResolvedValue(wallet),
      updateBalance: jest.fn(),
    };
    transactionRepository = {
      create: jest.fn((model) =>
        Promise.resolve(
          new WalletTransactionHistoryModel({ ...model, id: 10 }),
        ),
      ),
      findByExternalReference: jest.fn().mockResolvedValue(null),
      findByGatewayChargeId: jest.fn().mockResolvedValue(null),
      updateSettlement: jest.fn(),
    };
    configService = { get: jest.fn().mockReturnValue('BRL') };

    useCase = new CreateDepositUseCase(
      paymentGateway as any,
      transactionManager as any,
      walletRepository as any,
      transactionRepository as any,
      configService as any,
    );
  });

  it('cria uma cobrança no gateway e registra a transação como PENDING sem creditar saldo', async () => {
    const result = await useCase.execute({
      source: 'saas-a',
      amount: 10050,
      externalReference: 'tx_abc',
    });

    expect(paymentGateway.createCharge).toHaveBeenCalledWith({
      source: 'saas-a',
      amount: 10050,
      externalReference: 'tx_abc',
    });

    // A transação criada é PENDING e o saldo não muda (new == previous).
    const created = transactionRepository.create.mock.calls[0][0];
    expect(created.status).toBe(TransactionStatusEnum.PENDING);
    expect(created.previousBalance).toBe(5000);
    expect(created.newBalance).toBe(5000);
    expect(created.gatewayChargeId).toBe('stub_charge_1');
    expect(created.externalReference).toBe('tx_abc');

    // O saldo da wallet NÃO é atualizado na criação do depósito.
    expect(walletRepository.updateBalance).not.toHaveBeenCalled();

    // Retorno com transação e dados do QR Code.
    expect(result.transaction.id).toBe(10);
    expect(result.charge.qrCodePayload).toBe('PIX-PAYLOAD');
    expect(result.charge.gatewayChargeId).toBe('stub_charge_1');
  });

  it('rejeita amount não positivo', async () => {
    await expect(
      useCase.execute({ source: 'saas-a', amount: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(paymentGateway.createCharge).not.toHaveBeenCalled();
  });

  it('rejeita amount não inteiro', async () => {
    await expect(
      useCase.execute({ source: 'saas-a', amount: 10.5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('é idempotente: rejeita se já existe depósito para a referência', async () => {
    transactionRepository.findByExternalReference.mockResolvedValue(
      new WalletTransactionHistoryModel({ id: 99 }),
    );

    await expect(
      useCase.execute({
        source: 'saas-a',
        amount: 100,
        externalReference: 'dup',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    // Não deve chamar o gateway se já existe.
    expect(paymentGateway.createCharge).not.toHaveBeenCalled();
    expect(transactionRepository.create).not.toHaveBeenCalled();
  });

  it('não checa idempotência quando não há externalReference', async () => {
    await useCase.execute({ source: 'saas-a', amount: 100 });
    expect(
      transactionRepository.findByExternalReference,
    ).not.toHaveBeenCalled();
    expect(paymentGateway.createCharge).toHaveBeenCalled();
  });
});
