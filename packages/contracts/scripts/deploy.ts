import * as fs from 'node:fs';
import * as path from 'node:path';
import { ethers, network, run } from 'hardhat';

async function main(): Promise<void> {
  const initialAdmin = process.env.INITIAL_ADMIN_ADDRESS;
  if (!initialAdmin) {
    throw new Error('INITIAL_ADMIN_ADDRESS not set in environment');
  }
  if (!ethers.isAddress(initialAdmin)) {
    throw new Error(`INITIAL_ADMIN_ADDRESS is not a valid address: ${initialAdmin}`);
  }

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error('No signer available. Set DEPLOYER_PRIVATE_KEY for live networks.');
  }

  const chainId = network.config.chainId ?? 'unknown';
  console.log(`\nDeploying VeriTrustRegistry`);
  console.log(`  Network:       ${network.name} (chainId ${chainId})`);
  console.log(`  Deployer:      ${deployer.address}`);
  console.log(`  Initial admin: ${initialAdmin}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`  Balance:       ${ethers.formatEther(balance)} (native)`);

  const Factory = await ethers.getContractFactory('VeriTrustRegistry');
  const registry = await Factory.deploy(initialAdmin);
  const tx = registry.deploymentTransaction();
  if (!tx) throw new Error('Deployment transaction is null');

  console.log(`\n  tx hash: ${tx.hash}`);
  console.log(`  Waiting for deployment...`);
  await registry.waitForDeployment();
  const address = await registry.getAddress();
  console.log(`\n  Deployed at: ${address}`);

  const out = {
    network: network.name,
    chainId: typeof chainId === 'number' ? chainId : null,
    address,
    initialAdmin,
    txHash: tx.hash,
    deployedAt: new Date().toISOString(),
    abi: 'artifacts/contracts/VeriTrustRegistry.sol/VeriTrustRegistry.json',
  };
  const dir = path.resolve(__dirname, '..', 'deployments');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${network.name}.json`);
  fs.writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`  Wrote ${path.relative(process.cwd(), file)}`);

  const isLocal = network.name === 'hardhat' || network.name === 'localhost';
  if (!isLocal && process.env.POLYGONSCAN_API_KEY) {
    console.log(`\n  Waiting 5 confirmations before block-explorer verification...`);
    await tx.wait(5);
    try {
      console.log(`  Submitting verify:verify...`);
      await run('verify:verify', {
        address,
        constructorArguments: [initialAdmin],
      });
      console.log(`  Verified.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`  Verification did not complete (you can re-run later):\n    ${message}`);
    }
  } else if (!isLocal) {
    console.log(`\n  Skipping verification — POLYGONSCAN_API_KEY not set.`);
  }

  console.log(`\nDone.\n`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
