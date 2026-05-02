import * as path from 'node:path';
import { config as loadEnv } from 'dotenv';
import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

// Load monorepo root .env first, then package-local .env (overrides root).
loadEnv({ path: path.resolve(__dirname, '../../.env') });
loadEnv({ path: path.resolve(__dirname, '.env'), override: true });

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY ?? '';
const INFURA_API_KEY = process.env.INFURA_API_KEY ?? '';
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? '';
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY ?? '';

const PUBLIC_AMOY_RPC = 'https://rpc-amoy.polygon.technology';

const amoyPrimary =
  process.env.POLYGON_AMOY_RPC_URL_PRIMARY ||
  (ALCHEMY_API_KEY ? `https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_API_KEY}` : '') ||
  (INFURA_API_KEY ? `https://polygon-amoy.infura.io/v3/${INFURA_API_KEY}` : '') ||
  PUBLIC_AMOY_RPC;

const accounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: false,
      evmVersion: 'paris',
      metadata: { bytecodeHash: 'none' },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: false,
    },
    polygonAmoy: {
      url: amoyPrimary,
      chainId: 80002,
      accounts,
    },
  },
  etherscan: {
    apiKey: {
      polygonAmoy: POLYGONSCAN_API_KEY,
    },
    customChains: [
      {
        network: 'polygonAmoy',
        chainId: 80002,
        urls: {
          apiURL: 'https://api-amoy.polygonscan.com/api',
          browserURL: 'https://amoy.polygonscan.com',
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === 'true',
    currency: 'USD',
    excludeContracts: [],
  },
  typechain: {
    outDir: 'typechain-types',
    target: 'ethers-v6',
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  mocha: {
    timeout: 60_000,
  },
};

export default config;
