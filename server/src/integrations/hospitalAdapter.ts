export interface HospitalIntegrationStatus {
  hisStatus: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR';
  laboratoryStatus: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR';
  pharmacyStatus: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR';
  configuredEndpoint?: string;
}

export class HospitalAdapter {
  private endpoint: string | undefined;

  constructor() {
    this.endpoint = process.env.HOSPITAL_HMIS_URL;
  }

  public getStatus(): HospitalIntegrationStatus {
    return {
      hisStatus: this.endpoint ? 'CONNECTED' : 'NOT_CONFIGURED',
      laboratoryStatus: 'NOT_CONFIGURED',
      pharmacyStatus: 'NOT_CONFIGURED',
      configuredEndpoint: this.endpoint || undefined
    };
  }
}

export const hospitalAdapter = new HospitalAdapter();
