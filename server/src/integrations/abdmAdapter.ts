export interface AbdmStatusResponse {
  status: 'NOT_CONNECTED' | 'CONNECTED' | 'DEGRADED';
  environment?: string;
  gatewayUrl?: string;
  facilityId?: string;
  message: string;
}

export class AbdmAdapter {
  private clientId: string | undefined;
  private clientSecret: string | undefined;
  private gatewayUrl: string | undefined;
  private facilityId: string | undefined;
  private environment: string;

  constructor() {
    this.clientId = process.env.ABDM_CLIENT_ID;
    this.clientSecret = process.env.ABDM_CLIENT_SECRET;
    this.gatewayUrl = process.env.ABDM_GATEWAY_URL;
    this.facilityId = process.env.ABDM_FACILITY_ID;
    this.environment = process.env.ABDM_ENVIRONMENT || 'sandbox';
  }

  public getStatus(): AbdmStatusResponse {
    if (!this.clientId || !this.clientSecret || !this.gatewayUrl) {
      return {
        status: 'NOT_CONNECTED',
        environment: this.environment,
        message: 'ABDM Sandbox credentials are not configured. Application operates in localized facility mode.'
      };
    }

    return {
      status: 'CONNECTED',
      environment: this.environment,
      gatewayUrl: this.gatewayUrl,
      facilityId: this.facilityId,
      message: 'ABDM Sandbox Gateway integration configured.'
    };
  }

  public async verifyAbhaAddress(abhaAddress: string): Promise<{ success: boolean; message: string }> {
    const status = this.getStatus();
    if (status.status !== 'CONNECTED') {
      throw new Error('ABDM_NOT_CONNECTED: Official ABDM Gateway is not connected. Cannot perform live ABHA lookup.');
    }
    // Stub for live ABDM M1/M2/M3 endpoint call
    throw new Error('ABDM_LIVE_TRANSACTION_UNAVAILABLE: Live ABHA Gateway verification requires active network tunnel.');
  }
}

export const abdmAdapter = new AbdmAdapter();
