import {
  createPublicClient,
  http,
  fallback,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { polygonAmoy } from 'viem/chains';
import { VeriTrustRegistryAbi } from './abi';
import { getAmoyFallbackRpcUrl, getAmoyRpcUrl, getEnv } from '../env';

export interface OnChainCredential {
  readonly exists: boolean;
  readonly issuer: Address;
  readonly registeredAt: number;
  readonly revokedAt: number;
  readonly revocationReason: number;
  readonly revoked: boolean;
}

let publicClient: PublicClient | null = null;

export function getPublicClient(): PublicClient {
  if (publicClient) return publicClient;

  const primary = getAmoyRpcUrl();
  const fallbackUrl = getAmoyFallbackRpcUrl();
  const transports = [http(primary, { retryCount: 3, retryDelay: 200 })];
  if (fallbackUrl) transports.push(http(fallbackUrl, { retryCount: 2, retryDelay: 200 }));

  publicClient = createPublicClient({
    chain: polygonAmoy,
    transport: transports.length > 1 ? fallback(transports, { rank: false }) : transports[0]!,
  });
  return publicClient;
}

function registryAddress(): Address {
  const env = getEnv();
  if (!env.NEXT_PUBLIC_REGISTRY_ADDRESS) {
    throw new Error('NEXT_PUBLIC_REGISTRY_ADDRESS not set — deploy the contract first.');
  }
  return env.NEXT_PUBLIC_REGISTRY_ADDRESS as Address;
}

/// Read the on-chain record for a credential hash. Network errors propagate.
export async function readCredential(credentialHash: Hex): Promise<OnChainCredential> {
  const client = getPublicClient();
  const result = (await client.readContract({
    address: registryAddress(),
    abi: VeriTrustRegistryAbi,
    functionName: 'verifyCredential',
    args: [credentialHash],
  })) as readonly [boolean, Address, number, number, number, boolean];

  const [exists, issuer, registeredAt, revokedAt, revocationReason, revoked] = result;
  return {
    exists,
    issuer,
    registeredAt: Number(registeredAt),
    revokedAt: Number(revokedAt),
    revocationReason: Number(revocationReason),
    revoked,
  };
}

export async function isAuthorizedIssuer(account: Address): Promise<boolean> {
  const client = getPublicClient();
  return (await client.readContract({
    address: registryAddress(),
    abi: VeriTrustRegistryAbi,
    functionName: 'isAuthorizedIssuer',
    args: [account],
  })) as boolean;
}

/// Build a write request for the issuer's wallet to sign. The wallet client
/// belongs to the connected user (passed in from the API route), not the
/// server — issuers sign their own state-changing transactions.
export async function writeRegisterCredential(
  walletClient: WalletClient,
  account: Address,
  credentialHash: Hex,
): Promise<Hex> {
  const { request } = await getPublicClient().simulateContract({
    address: registryAddress(),
    abi: VeriTrustRegistryAbi,
    functionName: 'registerCredential',
    args: [credentialHash],
    account,
  });
  return walletClient.writeContract(request);
}

export async function writeRevokeCredential(
  walletClient: WalletClient,
  account: Address,
  credentialHash: Hex,
  reason: number,
): Promise<Hex> {
  const { request } = await getPublicClient().simulateContract({
    address: registryAddress(),
    abi: VeriTrustRegistryAbi,
    functionName: 'revokeCredential',
    args: [credentialHash, reason],
    account,
  });
  return walletClient.writeContract(request);
}

/// Wait for a tx to confirm and return the receipt block number.
export async function waitForConfirmation(txHash: Hex, confirmations = 2) {
  return getPublicClient().waitForTransactionReceipt({ hash: txHash, confirmations });
}
