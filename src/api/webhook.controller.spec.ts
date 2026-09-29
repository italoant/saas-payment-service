import { WebhookController } from './webhook.controller';
import { TransactionStatusEnum } from '@domain/shared/enums/transaction-status.enum';
import { WalletTransactionHistoryModel } from '@domain/wallet/models/wallet-transaction-history.model';

describe('WebhookController', () => {
  let controller: WebhookController;
  let processDepositWebhook: { execute: jest.Mock };

  beforeEach(() => {
    processDepositWebhook = {
      execute: jest.fn().mockResolvedValue(
        new WalletTransactionHistoryModel({
          id: 10,
          source: 'saas-a',
          previousBalance: 5000,
          newBalance: 15050,
          status: TransactionStatusEnum.COMPLETED,
        }),
      ),
    };
    controller = new WebhookController(processDepositWebhook as any);
  });

  it('repassa o id da cobrança ao use-case e monta a resposta', async () => {
    const response = await controller.handle({
      id: 'stub_charge_1',
      status: 'paid',
    });

    expect(processDepositWebhook.execute).toHaveBeenCalledWith({
      gatewayChargeId: 'stub_charge_1',
      status: 'paid',
      rawPayload: { id: 'stub_charge_1', status: 'paid' },
    });

    expect(response).toEqual({
      transactionId: 10,
      source: 'saas-a',
      previousBalance: 5000,
      newBalance: 15050,
      status: TransactionStatusEnum.COMPLETED,
    });
  });
});
