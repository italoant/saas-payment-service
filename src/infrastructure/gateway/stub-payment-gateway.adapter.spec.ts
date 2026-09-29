import { StubPaymentGatewayAdapter } from './stub-payment-gateway.adapter';

describe('StubPaymentGatewayAdapter', () => {
  let adapter: StubPaymentGatewayAdapter;

  beforeEach(() => {
    adapter = new StubPaymentGatewayAdapter();
  });

  it('gera uma cobrança com id, payload de QR Code e expiração', async () => {
    const before = Date.now();
    const result = await adapter.createCharge({
      source: 'saas-a',
      amount: 10050,
      externalReference: 'tx_abc',
    });

    expect(result.gatewayChargeId).toMatch(/^stub_/);
    expect(typeof result.qrCodePayload).toBe('string');
    expect(result.qrCodePayload.length).toBeGreaterThan(0);
    // Payload embute os dados da cobrança.
    expect(result.qrCodePayload).toContain('source:saas-a');
    expect(result.qrCodePayload).toContain('amount:10050');
    expect(result.qrCodePayload).toContain('ref:tx_abc');
    // Expira no futuro.
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.expiresAt!.getTime()).toBeGreaterThan(before);
  });

  it('usa ref:- quando não há externalReference', async () => {
    const result = await adapter.createCharge({
      source: 'saas-b',
      amount: 500,
    });
    expect(result.qrCodePayload).toContain('ref:-');
  });

  it('gera ids distintos a cada chamada', async () => {
    const a = await adapter.createCharge({ source: 's', amount: 1 });
    const b = await adapter.createCharge({ source: 's', amount: 1 });
    expect(a.gatewayChargeId).not.toBe(b.gatewayChargeId);
  });
});
