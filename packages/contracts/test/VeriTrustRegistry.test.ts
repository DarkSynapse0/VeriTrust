import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import type { VeriTrustRegistry } from '../typechain-types';

const ZERO_ADDR = ethers.ZeroAddress;
const ZERO_HASH = ethers.ZeroHash;
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
const ISSUER_ROLE = ethers.id('ISSUER_ROLE');

const REASON = {
  ERROR: 1,
  FRAUD: 2,
  EXPIRED: 3,
  OTHER: 4,
} as const;

const hash = (s: string): string => ethers.keccak256(ethers.toUtf8Bytes(s));

describe('VeriTrustRegistry', () => {
  async function deployFixture() {
    const [admin, issuer, otherIssuer, stranger, newAdmin] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('VeriTrustRegistry');
    const registry = (await Factory.deploy(admin.address)) as unknown as VeriTrustRegistry;
    await registry.waitForDeployment();
    return { registry, admin, issuer, otherIssuer, stranger, newAdmin };
  }

  async function withIssuerFixture() {
    const ctx = await deployFixture();
    await ctx.registry.connect(ctx.admin).authorizeIssuer(ctx.issuer.address);
    return ctx;
  }

  describe('constructor', () => {
    it('reverts when initialAdmin is the zero address', async () => {
      const Factory = await ethers.getContractFactory('VeriTrustRegistry');
      await expect(Factory.deploy(ZERO_ADDR)).to.be.revertedWithCustomError(Factory, 'ZeroAddress');
    });

    it('grants DEFAULT_ADMIN_ROLE to the initial admin', async () => {
      const { registry, admin } = await loadFixture(deployFixture);
      expect(await registry.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.equal(true);
    });

    it('uses DEFAULT_ADMIN_ROLE as the role admin for ISSUER_ROLE', async () => {
      const { registry } = await loadFixture(deployFixture);
      expect(await registry.getRoleAdmin(ISSUER_ROLE)).to.equal(DEFAULT_ADMIN_ROLE);
    });

    it('emits RoleGranted from OZ AccessControl on deploy', async () => {
      const [admin] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory('VeriTrustRegistry');
      const tx = await Factory.deploy(admin.address);
      await expect(tx.deploymentTransaction())
        .to.emit(tx, 'RoleGranted')
        .withArgs(DEFAULT_ADMIN_ROLE, admin.address, admin.address);
    });
  });

  describe('authorizeIssuer', () => {
    it('admin authorizes; emits IssuerAuthorized; grants ISSUER_ROLE', async () => {
      const { registry, admin, issuer } = await loadFixture(deployFixture);
      await expect(registry.connect(admin).authorizeIssuer(issuer.address))
        .to.emit(registry, 'IssuerAuthorized')
        .withArgs(issuer.address, admin.address);
      expect(await registry.hasRole(ISSUER_ROLE, issuer.address)).to.equal(true);
      expect(await registry.isAuthorizedIssuer(issuer.address)).to.equal(true);
    });

    it('non-admin cannot authorize', async () => {
      const { registry, stranger, issuer } = await loadFixture(deployFixture);
      await expect(registry.connect(stranger).authorizeIssuer(issuer.address))
        .to.be.revertedWithCustomError(registry, 'AccessControlUnauthorizedAccount')
        .withArgs(stranger.address, DEFAULT_ADMIN_ROLE);
    });

    it('reverts on zero address', async () => {
      const { registry, admin } = await loadFixture(deployFixture);
      await expect(
        registry.connect(admin).authorizeIssuer(ZERO_ADDR),
      ).to.be.revertedWithCustomError(registry, 'ZeroAddress');
    });

    it('re-authorization is a no-op (no IssuerAuthorized event, role still granted)', async () => {
      const { registry, admin, issuer } = await loadFixture(withIssuerFixture);
      const tx = await registry.connect(admin).authorizeIssuer(issuer.address);
      const receipt = await tx.wait();
      const events = await registry.queryFilter(
        registry.filters.IssuerAuthorized(),
        receipt!.blockNumber,
        receipt!.blockNumber,
      );
      expect(events).to.have.lengthOf(0);
      expect(await registry.isAuthorizedIssuer(issuer.address)).to.equal(true);
    });
  });

  describe('revokeIssuer', () => {
    it('admin revokes; emits IssuerRevoked; role removed', async () => {
      const { registry, admin, issuer } = await loadFixture(withIssuerFixture);
      await expect(registry.connect(admin).revokeIssuer(issuer.address))
        .to.emit(registry, 'IssuerRevoked')
        .withArgs(issuer.address, admin.address);
      expect(await registry.isAuthorizedIssuer(issuer.address)).to.equal(false);
    });

    it('non-admin cannot revoke', async () => {
      const { registry, stranger, issuer } = await loadFixture(withIssuerFixture);
      await expect(registry.connect(stranger).revokeIssuer(issuer.address))
        .to.be.revertedWithCustomError(registry, 'AccessControlUnauthorizedAccount')
        .withArgs(stranger.address, DEFAULT_ADMIN_ROLE);
    });

    it('reverts on zero address', async () => {
      const { registry, admin } = await loadFixture(deployFixture);
      await expect(registry.connect(admin).revokeIssuer(ZERO_ADDR)).to.be.revertedWithCustomError(
        registry,
        'ZeroAddress',
      );
    });

    it('revoking an unauthorized address is a no-op (no event)', async () => {
      const { registry, admin, stranger } = await loadFixture(deployFixture);
      const tx = await registry.connect(admin).revokeIssuer(stranger.address);
      const receipt = await tx.wait();
      const events = await registry.queryFilter(
        registry.filters.IssuerRevoked(),
        receipt!.blockNumber,
        receipt!.blockNumber,
      );
      expect(events).to.have.lengthOf(0);
    });

    it('re-authorization after revocation works', async () => {
      const { registry, admin, issuer } = await loadFixture(withIssuerFixture);
      await registry.connect(admin).revokeIssuer(issuer.address);
      expect(await registry.isAuthorizedIssuer(issuer.address)).to.equal(false);
      await registry.connect(admin).authorizeIssuer(issuer.address);
      expect(await registry.isAuthorizedIssuer(issuer.address)).to.equal(true);
    });
  });

  describe('transferAdmin', () => {
    it('admin can transfer to a new address', async () => {
      const { registry, admin, newAdmin } = await loadFixture(deployFixture);
      await expect(registry.connect(admin).transferAdmin(newAdmin.address))
        .to.emit(registry, 'AdminTransferred')
        .withArgs(admin.address, newAdmin.address);
      expect(await registry.hasRole(DEFAULT_ADMIN_ROLE, newAdmin.address)).to.equal(true);
      expect(await registry.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.equal(false);
    });

    it('non-admin cannot transfer', async () => {
      const { registry, stranger, newAdmin } = await loadFixture(deployFixture);
      await expect(registry.connect(stranger).transferAdmin(newAdmin.address))
        .to.be.revertedWithCustomError(registry, 'AccessControlUnauthorizedAccount')
        .withArgs(stranger.address, DEFAULT_ADMIN_ROLE);
    });

    it('reverts on zero address', async () => {
      const { registry, admin } = await loadFixture(deployFixture);
      await expect(registry.connect(admin).transferAdmin(ZERO_ADDR)).to.be.revertedWithCustomError(
        registry,
        'ZeroAddress',
      );
    });

    it('reverts when transferring to self', async () => {
      const { registry, admin } = await loadFixture(deployFixture);
      await expect(
        registry.connect(admin).transferAdmin(admin.address),
      ).to.be.revertedWithCustomError(registry, 'AdminTransferToSelf');
    });

    it('after transfer, the old admin can no longer authorize issuers', async () => {
      const { registry, admin, newAdmin, issuer } = await loadFixture(deployFixture);
      await registry.connect(admin).transferAdmin(newAdmin.address);
      await expect(registry.connect(admin).authorizeIssuer(issuer.address))
        .to.be.revertedWithCustomError(registry, 'AccessControlUnauthorizedAccount')
        .withArgs(admin.address, DEFAULT_ADMIN_ROLE);
      // New admin can.
      await expect(registry.connect(newAdmin).authorizeIssuer(issuer.address))
        .to.emit(registry, 'IssuerAuthorized')
        .withArgs(issuer.address, newAdmin.address);
    });
  });

  describe('registerCredential', () => {
    it('authorized issuer can register; emits event; record stored correctly', async () => {
      const { registry, issuer } = await loadFixture(withIssuerFixture);
      const h = hash('cred-1');
      await expect(registry.connect(issuer).registerCredential(h))
        .to.emit(registry, 'CredentialRegistered')
        .withArgs(h, issuer.address, anyValue);

      const ts = await time.latest();
      const r = await registry.verifyCredential(h);
      expect(r.exists).to.equal(true);
      expect(r.issuer).to.equal(issuer.address);
      expect(r.registeredAt).to.equal(ts);
      expect(r.revokedAt).to.equal(0n);
      expect(r.revocationReason).to.equal(0);
      expect(r.revoked).to.equal(false);
    });

    it('non-issuer cannot register', async () => {
      const { registry, stranger } = await loadFixture(deployFixture);
      const h = hash('cred-1');
      await expect(registry.connect(stranger).registerCredential(h))
        .to.be.revertedWithCustomError(registry, 'AccessControlUnauthorizedAccount')
        .withArgs(stranger.address, ISSUER_ROLE);
    });

    it('zero hash reverts', async () => {
      const { registry, issuer } = await loadFixture(withIssuerFixture);
      await expect(
        registry.connect(issuer).registerCredential(ZERO_HASH),
      ).to.be.revertedWithCustomError(registry, 'ZeroHash');
    });

    it('duplicate hash reverts (same issuer)', async () => {
      const { registry, issuer } = await loadFixture(withIssuerFixture);
      const h = hash('cred-dup');
      await registry.connect(issuer).registerCredential(h);
      await expect(registry.connect(issuer).registerCredential(h))
        .to.be.revertedWithCustomError(registry, 'CredentialAlreadyRegistered')
        .withArgs(h);
    });

    it('a different issuer cannot re-register an existing hash', async () => {
      const { registry, admin, issuer, otherIssuer } = await loadFixture(withIssuerFixture);
      await registry.connect(admin).authorizeIssuer(otherIssuer.address);
      const h = hash('cred-1');
      await registry.connect(issuer).registerCredential(h);
      await expect(registry.connect(otherIssuer).registerCredential(h))
        .to.be.revertedWithCustomError(registry, 'CredentialAlreadyRegistered')
        .withArgs(h);
    });

    it('a de-authorized issuer cannot register new credentials', async () => {
      const { registry, admin, issuer } = await loadFixture(withIssuerFixture);
      await registry.connect(admin).revokeIssuer(issuer.address);
      const h = hash('cred-x');
      await expect(registry.connect(issuer).registerCredential(h))
        .to.be.revertedWithCustomError(registry, 'AccessControlUnauthorizedAccount')
        .withArgs(issuer.address, ISSUER_ROLE);
    });

    it('a credential issued by a later-deauthorized issuer remains queryable', async () => {
      const { registry, admin, issuer } = await loadFixture(withIssuerFixture);
      const h = hash('legacy');
      await registry.connect(issuer).registerCredential(h);
      await registry.connect(admin).revokeIssuer(issuer.address);
      const r = await registry.verifyCredential(h);
      expect(r.exists).to.equal(true);
      expect(r.issuer).to.equal(issuer.address);
      expect(r.revoked).to.equal(false);
    });
  });

  describe('batchRegister', () => {
    it('authorized issuer registers a batch; emits per-item event + summary', async () => {
      const { registry, issuer } = await loadFixture(withIssuerFixture);
      const hashes = [hash('a'), hash('b'), hash('c')];
      const tx = registry.connect(issuer).batchRegister(hashes);
      for (const h of hashes) {
        await expect(tx)
          .to.emit(registry, 'CredentialRegistered')
          .withArgs(h, issuer.address, anyValue);
      }
      await expect(tx).to.emit(registry, 'BatchRegistered').withArgs(issuer.address, 3);
      for (const h of hashes) {
        const r = await registry.verifyCredential(h);
        expect(r.exists).to.equal(true);
        expect(r.issuer).to.equal(issuer.address);
      }
    });

    it('empty batch reverts', async () => {
      const { registry, issuer } = await loadFixture(withIssuerFixture);
      await expect(registry.connect(issuer).batchRegister([])).to.be.revertedWithCustomError(
        registry,
        'EmptyBatch',
      );
    });

    it('oversize batch reverts with size + max in args', async () => {
      const { registry, issuer } = await loadFixture(withIssuerFixture);
      const hashes: string[] = [];
      for (let i = 0; i < 501; i++) hashes.push(hash(`o-${i}`));
      await expect(registry.connect(issuer).batchRegister(hashes))
        .to.be.revertedWithCustomError(registry, 'BatchTooLarge')
        .withArgs(501, 500);
    });

    it('non-issuer cannot batch register', async () => {
      const { registry, stranger } = await loadFixture(deployFixture);
      await expect(registry.connect(stranger).batchRegister([hash('a')]))
        .to.be.revertedWithCustomError(registry, 'AccessControlUnauthorizedAccount')
        .withArgs(stranger.address, ISSUER_ROLE);
    });

    it('a duplicate hash inside the batch reverts the whole transaction', async () => {
      const { registry, issuer } = await loadFixture(withIssuerFixture);
      const dup = hash('dup');
      await registry.connect(issuer).registerCredential(dup);
      await expect(registry.connect(issuer).batchRegister([hash('a'), dup, hash('c')]))
        .to.be.revertedWithCustomError(registry, 'CredentialAlreadyRegistered')
        .withArgs(dup);
      expect((await registry.verifyCredential(hash('a'))).exists).to.equal(false);
      expect((await registry.verifyCredential(hash('c'))).exists).to.equal(false);
    });

    it('a zero hash inside the batch reverts the whole transaction', async () => {
      const { registry, issuer } = await loadFixture(withIssuerFixture);
      await expect(
        registry.connect(issuer).batchRegister([hash('a'), ZERO_HASH]),
      ).to.be.revertedWithCustomError(registry, 'ZeroHash');
      expect((await registry.verifyCredential(hash('a'))).exists).to.equal(false);
    });

    it('internal duplicates revert at the second occurrence', async () => {
      const { registry, issuer } = await loadFixture(withIssuerFixture);
      const same = hash('same');
      await expect(registry.connect(issuer).batchRegister([same, same]))
        .to.be.revertedWithCustomError(registry, 'CredentialAlreadyRegistered')
        .withArgs(same);
    });

    it('accepts the maximum batch size (500)', async () => {
      const { registry, issuer } = await loadFixture(withIssuerFixture);
      const hashes: string[] = [];
      for (let i = 0; i < 500; i++) hashes.push(hash(`m-${i}`));
      await expect(registry.connect(issuer).batchRegister(hashes))
        .to.emit(registry, 'BatchRegistered')
        .withArgs(issuer.address, 500);
    });
  });

  describe('revokeCredential', () => {
    it('original issuer revokes; emits event; record updated', async () => {
      const { registry, issuer } = await loadFixture(withIssuerFixture);
      const h = hash('c-1');
      await registry.connect(issuer).registerCredential(h);
      await expect(registry.connect(issuer).revokeCredential(h, REASON.ERROR))
        .to.emit(registry, 'CredentialRevoked')
        .withArgs(h, issuer.address, REASON.ERROR, anyValue);
      const ts = await time.latest();
      const r = await registry.verifyCredential(h);
      expect(r.revoked).to.equal(true);
      expect(r.revokedAt).to.equal(ts);
      expect(r.revocationReason).to.equal(REASON.ERROR);
    });

    it("a different authorized issuer cannot revoke someone else's credential", async () => {
      const { registry, admin, issuer, otherIssuer } = await loadFixture(withIssuerFixture);
      await registry.connect(admin).authorizeIssuer(otherIssuer.address);
      const h = hash('c-1');
      await registry.connect(issuer).registerCredential(h);
      await expect(registry.connect(otherIssuer).revokeCredential(h, REASON.FRAUD))
        .to.be.revertedWithCustomError(registry, 'NotOriginalIssuer')
        .withArgs(h, otherIssuer.address, issuer.address);
    });

    it('a non-issuer cannot revoke', async () => {
      const { registry, issuer, stranger } = await loadFixture(withIssuerFixture);
      const h = hash('c-1');
      await registry.connect(issuer).registerCredential(h);
      await expect(registry.connect(stranger).revokeCredential(h, REASON.ERROR))
        .to.be.revertedWithCustomError(registry, 'AccessControlUnauthorizedAccount')
        .withArgs(stranger.address, ISSUER_ROLE);
    });

    it('non-existent credential reverts', async () => {
      const { registry, issuer } = await loadFixture(withIssuerFixture);
      const h = hash('never-registered');
      await expect(registry.connect(issuer).revokeCredential(h, REASON.ERROR))
        .to.be.revertedWithCustomError(registry, 'CredentialNotFound')
        .withArgs(h);
    });

    it('already-revoked credential reverts', async () => {
      const { registry, issuer } = await loadFixture(withIssuerFixture);
      const h = hash('c-1');
      await registry.connect(issuer).registerCredential(h);
      await registry.connect(issuer).revokeCredential(h, REASON.ERROR);
      await expect(registry.connect(issuer).revokeCredential(h, REASON.OTHER))
        .to.be.revertedWithCustomError(registry, 'CredentialAlreadyRevoked')
        .withArgs(h);
    });

    it('invalid reason 0 reverts', async () => {
      const { registry, issuer } = await loadFixture(withIssuerFixture);
      const h = hash('c-1');
      await registry.connect(issuer).registerCredential(h);
      await expect(registry.connect(issuer).revokeCredential(h, 0))
        .to.be.revertedWithCustomError(registry, 'InvalidRevocationReason')
        .withArgs(0);
    });

    it('invalid reason >MAX_REVOCATION_REASON reverts', async () => {
      const { registry, issuer } = await loadFixture(withIssuerFixture);
      const h = hash('c-1');
      await registry.connect(issuer).registerCredential(h);
      await expect(registry.connect(issuer).revokeCredential(h, 5))
        .to.be.revertedWithCustomError(registry, 'InvalidRevocationReason')
        .withArgs(5);
    });

    it('a de-authorized issuer cannot revoke their own credentials', async () => {
      const { registry, admin, issuer } = await loadFixture(withIssuerFixture);
      const h = hash('c-1');
      await registry.connect(issuer).registerCredential(h);
      await registry.connect(admin).revokeIssuer(issuer.address);
      await expect(registry.connect(issuer).revokeCredential(h, REASON.ERROR))
        .to.be.revertedWithCustomError(registry, 'AccessControlUnauthorizedAccount')
        .withArgs(issuer.address, ISSUER_ROLE);
    });

    it('each revocation reason 1..4 is accepted and stored', async () => {
      const { registry, issuer } = await loadFixture(withIssuerFixture);
      for (const r of Object.values(REASON)) {
        const h = hash(`reason-${r}`);
        await registry.connect(issuer).registerCredential(h);
        await registry.connect(issuer).revokeCredential(h, r);
        const result = await registry.verifyCredential(h);
        expect(result.revocationReason).to.equal(r);
        expect(result.revoked).to.equal(true);
      }
    });
  });

  describe('verifyCredential', () => {
    it('returns a fully zeroed record for an unregistered hash', async () => {
      const { registry } = await loadFixture(deployFixture);
      const r = await registry.verifyCredential(hash('nope'));
      expect(r.exists).to.equal(false);
      expect(r.issuer).to.equal(ZERO_ADDR);
      expect(r.registeredAt).to.equal(0n);
      expect(r.revokedAt).to.equal(0n);
      expect(r.revocationReason).to.equal(0);
      expect(r.revoked).to.equal(false);
    });
  });

  describe('isAuthorizedIssuer', () => {
    it('returns false for a never-authorized address', async () => {
      const { registry, stranger } = await loadFixture(deployFixture);
      expect(await registry.isAuthorizedIssuer(stranger.address)).to.equal(false);
    });

    it('toggles correctly through authorize → revoke → re-authorize', async () => {
      const { registry, admin, issuer } = await loadFixture(deployFixture);
      expect(await registry.isAuthorizedIssuer(issuer.address)).to.equal(false);
      await registry.connect(admin).authorizeIssuer(issuer.address);
      expect(await registry.isAuthorizedIssuer(issuer.address)).to.equal(true);
      await registry.connect(admin).revokeIssuer(issuer.address);
      expect(await registry.isAuthorizedIssuer(issuer.address)).to.equal(false);
      await registry.connect(admin).authorizeIssuer(issuer.address);
      expect(await registry.isAuthorizedIssuer(issuer.address)).to.equal(true);
    });
  });

  describe('public constants', () => {
    it("exposes ISSUER_ROLE = keccak256('ISSUER_ROLE')", async () => {
      const { registry } = await loadFixture(deployFixture);
      expect(await registry.ISSUER_ROLE()).to.equal(ISSUER_ROLE);
    });

    it('exposes MAX_BATCH_SIZE = 500', async () => {
      const { registry } = await loadFixture(deployFixture);
      expect(await registry.MAX_BATCH_SIZE()).to.equal(500n);
    });

    it('exposes MAX_REVOCATION_REASON = 4', async () => {
      const { registry } = await loadFixture(deployFixture);
      expect(await registry.MAX_REVOCATION_REASON()).to.equal(4);
    });
  });
});
