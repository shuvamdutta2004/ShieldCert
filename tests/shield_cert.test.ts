/**
 * ShieldCert Test Suite
 * =====================
 * Tests for the Zero-Knowledge Certificate Verification contract.
 *
 * Three key test areas:
 *  1. Circuit logic  — verifies that the credential hash matches expected values
 *  2. State transitions — confirms counters increment correctly
 *  3. Privacy guarantee — confirms private inputs never appear in public outputs
 */

// ---------------------------------------------------------------------------
// Types mirroring the Compact contract
// ---------------------------------------------------------------------------

type Bytes32 = Uint8Array;
type Counter = { value: bigint };
type PublicKey = { bytes: Bytes32 };

interface LedgerState {
  credentialHash: Bytes32;
  issuanceCount: Counter;
  issuerPublicKey: PublicKey;
  revokedCount: Counter;
}

// ---------------------------------------------------------------------------
// Minimal local simulation helpers (used in place of actual Midnight runtime)
// These functions replicate the on-chain hashing logic in pure TypeScript
// so tests can run without a proof server.
// ---------------------------------------------------------------------------

import { createHash } from "crypto";

/** Simulates Compact's persistentHash<Vector<2, Bytes<32>>>([domain, secret]) */
function derivePublicKey(domain: string, secretHex: string): Bytes32 {
  const domainBytes = Buffer.alloc(32);
  Buffer.from(domain, "utf8").copy(domainBytes, 0, 0, Math.min(32, domain.length));

  const secretBytes = Buffer.from(secretHex.padEnd(64, "0"), "hex");

  const hash = createHash("sha256")
    .update(domainBytes)
    .update(secretBytes)
    .digest();

  return new Uint8Array(hash);
}

/** Simulates Compact's persistentHash<Vector<1, Bytes<32>>>([certData]) */
function hashCertificateData(certDataHex: string): Bytes32 {
  const certBytes = Buffer.from(certDataHex.padEnd(64, "0"), "hex");
  const hash = createHash("sha256").update(certBytes).digest();
  return new Uint8Array(hash);
}

/** Simulates the contract's revokedHash sentinel (pad(32, "REVOKED")) */
function revokedSentinel(): Bytes32 {
  const buf = Buffer.alloc(32, 0);
  Buffer.from("REVOKED", "utf8").copy(buf);
  return new Uint8Array(buf);
}

/** Compare two Bytes32 arrays */
function bytesEqual(a: Bytes32, b: Bytes32): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Simulated contract state machine
// (mirrors the Compact contract's register / verify / revoke circuits)
// ---------------------------------------------------------------------------

class ShieldCertSimulator {
  private state: LedgerState;
  private issuerSecretHex: string;
  private readonly DOMAIN = "shieldcert:issuer:pk:v1";

  constructor(issuerSecretHex: string) {
    this.issuerSecretHex = issuerSecretHex;
    const derivedPK = derivePublicKey(this.DOMAIN, issuerSecretHex);

    // Initialise state — mirrors the constructor() in Compact
    this.state = {
      credentialHash: new Uint8Array(32),
      issuanceCount: { value: 0n },
      issuerPublicKey: { bytes: derivedPK },
      revokedCount: { value: 0n },
    };
  }

  getState(): Readonly<LedgerState> {
    return this.state;
  }

  /** Simulates registerCredential() circuit */
  registerCredential(callerSecretHex: string, certDataHex: string): void {
    // Auth check — mirrors: assert(issuerPublicKey == deriveIssuerPublicKey(getIssuerSecret()))
    const callerPK = derivePublicKey(this.DOMAIN, callerSecretHex);
    if (!bytesEqual(callerPK, this.state.issuerPublicKey.bytes)) {
      throw new Error("Unauthorized: caller is not the registered issuer.");
    }

    // Hash the private data — mirrors: persistentHash<Vector<1, Bytes<32>>>([certData])
    const certHash = hashCertificateData(certDataHex);

    // Disclose only the hash (not raw data) — mirrors: credentialHash = disclose(certHash)
    this.state = {
      ...this.state,
      credentialHash: certHash,
      issuanceCount: { value: this.state.issuanceCount.value + 1n },
    };
  }

  /** Simulates verifyCredential() circuit */
  verifyCredential(callerSecretHex: string, certDataHex: string): boolean {
    const computedHash = hashCertificateData(certDataHex);

    // Hash must match on-chain commitment
    if (!bytesEqual(this.state.credentialHash, computedHash)) {
      throw new Error("Verification failed: certificate hash mismatch.");
    }

    // Issuer must be legitimate
    const callerPK = derivePublicKey(this.DOMAIN, callerSecretHex);
    if (!bytesEqual(callerPK, this.state.issuerPublicKey.bytes)) {
      throw new Error("Verification failed: issuer mismatch.");
    }

    return true;
  }

  /** Simulates revokeCredential() circuit */
  revokeCredential(callerSecretHex: string): void {
    const callerPK = derivePublicKey(this.DOMAIN, callerSecretHex);
    if (!bytesEqual(callerPK, this.state.issuerPublicKey.bytes)) {
      throw new Error("Unauthorized: only the issuer can revoke credentials.");
    }

    this.state = {
      ...this.state,
      credentialHash: revokedSentinel(),
      revokedCount: { value: this.state.revokedCount.value + 1n },
    };
  }
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

const ISSUER_SECRET = "deadbeefcafe1234deadbeefcafe1234deadbeefcafe1234deadbeefcafe1234";
const CERT_DATA_HEX = "abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abcd";
const ATTACKER_SECRET = "1111111111111111111111111111111111111111111111111111111111111111";

describe("ShieldCert — Compact Contract Simulation", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: Circuit Logic
  // Verifies the credential hash stored on-chain matches the expected
  // SHA-256 digest of the private certificate data.
  // ─────────────────────────────────────────────────────────────────────────
  describe("Test 1 — Circuit Logic: credential hash is correct", () => {
    it("should store the SHA-256 hash of the certificate data on-chain", () => {
      const contract = new ShieldCertSimulator(ISSUER_SECRET);
      contract.registerCredential(ISSUER_SECRET, CERT_DATA_HEX);

      const state = contract.getState();
      const expectedHash = hashCertificateData(CERT_DATA_HEX);

      expect(bytesEqual(state.credentialHash, expectedHash)).toBe(true);
    });

    it("should verify successfully when the correct certificate data is provided", () => {
      const contract = new ShieldCertSimulator(ISSUER_SECRET);
      contract.registerCredential(ISSUER_SECRET, CERT_DATA_HEX);

      // verifyCredential should not throw and should return true
      const result = contract.verifyCredential(ISSUER_SECRET, CERT_DATA_HEX);
      expect(result).toBe(true);
    });

    it("should fail verification when wrong certificate data is provided", () => {
      const contract = new ShieldCertSimulator(ISSUER_SECRET);
      contract.registerCredential(ISSUER_SECRET, CERT_DATA_HEX);

      const WRONG_CERT = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      expect(() => {
        contract.verifyCredential(ISSUER_SECRET, WRONG_CERT);
      }).toThrow("Verification failed: certificate hash mismatch.");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: State Transitions
  // Verifies issuanceCount and revokedCount increment correctly.
  // ─────────────────────────────────────────────────────────────────────────
  describe("Test 2 — State Transitions: counters increment correctly", () => {
    it("should increment issuanceCount by 1 after each registerCredential call", () => {
      const contract = new ShieldCertSimulator(ISSUER_SECRET);
      expect(contract.getState().issuanceCount.value).toBe(0n);

      contract.registerCredential(ISSUER_SECRET, CERT_DATA_HEX);
      expect(contract.getState().issuanceCount.value).toBe(1n);

      const CERT2 = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
      contract.registerCredential(ISSUER_SECRET, CERT2);
      expect(contract.getState().issuanceCount.value).toBe(2n);
    });

    it("should increment revokedCount by 1 after revokeCredential", () => {
      const contract = new ShieldCertSimulator(ISSUER_SECRET);
      contract.registerCredential(ISSUER_SECRET, CERT_DATA_HEX);
      expect(contract.getState().revokedCount.value).toBe(0n);

      contract.revokeCredential(ISSUER_SECRET);
      expect(contract.getState().revokedCount.value).toBe(1n);
    });

    it("should set credentialHash to the REVOKED sentinel after revocation", () => {
      const contract = new ShieldCertSimulator(ISSUER_SECRET);
      contract.registerCredential(ISSUER_SECRET, CERT_DATA_HEX);
      contract.revokeCredential(ISSUER_SECRET);

      const state = contract.getState();
      const sentinel = revokedSentinel();
      expect(bytesEqual(state.credentialHash, sentinel)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3: Private Inputs Are Never Exposed
  // Confirms that the public ledger state contains ONLY hash commitments
  // and never the raw private certificate data (name, DOB, credential type).
  // ─────────────────────────────────────────────────────────────────────────
  describe("Test 3 — Privacy: private inputs are never exposed in public state", () => {
    it("should NOT store raw certificate data on the public ledger", () => {
      const contract = new ShieldCertSimulator(ISSUER_SECRET);
      contract.registerCredential(ISSUER_SECRET, CERT_DATA_HEX);

      const state = contract.getState();
      const certBytes = Buffer.from(CERT_DATA_HEX, "hex");

      // The stored credentialHash must NOT equal the raw certificate bytes
      expect(bytesEqual(state.credentialHash, new Uint8Array(certBytes))).toBe(false);

      // The stored hash should be 32 bytes (SHA-256 digest size)
      expect(state.credentialHash.length).toBe(32);
    });

    it("should NOT expose the issuer secret key on the public ledger", () => {
      const contract = new ShieldCertSimulator(ISSUER_SECRET);
      const state = contract.getState();
      const secretBytes = Buffer.from(ISSUER_SECRET, "hex");

      // The public issuerPublicKey must NOT equal the raw secret key
      expect(bytesEqual(state.issuerPublicKey.bytes, new Uint8Array(secretBytes))).toBe(false);
    });

    it("should reject unauthorized callers from registering credentials", () => {
      const contract = new ShieldCertSimulator(ISSUER_SECRET);

      // An attacker with a different secret should be rejected
      expect(() => {
        contract.registerCredential(ATTACKER_SECRET, CERT_DATA_HEX);
      }).toThrow("Unauthorized: caller is not the registered issuer.");
    });

    it("should reject unauthorized callers from revoking credentials", () => {
      const contract = new ShieldCertSimulator(ISSUER_SECRET);
      contract.registerCredential(ISSUER_SECRET, CERT_DATA_HEX);

      expect(() => {
        contract.revokeCredential(ATTACKER_SECRET);
      }).toThrow("Unauthorized: only the issuer can revoke credentials.");
    });

    it("should produce different hashes for different certificate data", () => {
      const hash1 = hashCertificateData(CERT_DATA_HEX);
      const hash2 = hashCertificateData(ATTACKER_SECRET);

      // Different inputs must produce different hashes (collision resistance sanity check)
      expect(bytesEqual(hash1, hash2)).toBe(false);
    });
  });
});
