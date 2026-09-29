import { DepositController } from './deposit.controller';
import { TransactionStatusEnum } from '@domain/shared/enums/transaction-status.enum';
import { WalletTransactionHistoryModel } from '@domain/wallet/models/wallet-transaction-history.model';

describe('DepositController', () => {
  let controller: DepositController;
  let createDeposit: { execute: jest.Mock };

  beforeEach(() => {
    createDeposit = {
      execute: jest.fn().mockResolvedValue({
        transaction: new WalletTransactionHistoryModel({
          id: 10,
          amount: 10050,
          status: TransactionStatusEnum.PENDING,
        }),
        charge: {
          gatewayChargeId: 'stub_charge_1',
          qrCodePayload: 'PIX-PAYLOAD',
          qrCodeImage: undefined,
          expiresAt: new Date('2030-01-01T00:00:00Z'),
        },
      }),
    };
    controller = new DepositController(createDeposit as any);
  });

  it('repassa source e corpo ao use-case e monta a resposta com o QR Code', async () => {
    const response = await controller.handle('saas-a', {
      amount: 10050,
      externalReference: 'tx_abc',
    });

    expect(createDeposit.execute).toHaveBeenCalledWith({
      source: 'saas-a',
      amount: 10050,
      externalReference: 'tx_abc',
    });

    expect(response).toEqual({
      transactionId: 10,
      status: TransactionStatusEnum.PENDING,
      amount: 10050,
      gatewayChargeId: 'stub_charge_1',
      qrCode: {
        payload: 'PIX-PAYLOAD',
        image: undefined,
        expiresAt: new Date('2030-01-01T00:00:00Z'),
      },
    });
  });
});
