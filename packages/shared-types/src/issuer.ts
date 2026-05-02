import type { EthAddress } from './credential';

export interface IssuerProfile {
  readonly id: string;
  readonly walletAddress: EthAddress;
  readonly name: string;
  readonly displayName: string | null;
  readonly description: string | null;
  readonly websiteUrl: string | null;
  readonly logoUrl: string | null;
  readonly isAuthorized: boolean;
  readonly credentialsIssued: number;
  readonly credentialsRevoked: number;
  readonly authorizedAt: string | null;
  readonly createdAt: string;
}
