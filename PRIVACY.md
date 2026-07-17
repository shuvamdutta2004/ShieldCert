# Privacy Model Deep Dive — ShieldCert

## Overview

ShieldCert demonstrates **selective disclosure** on the Midnight Network using the Compact smart contract language. The core principle: a credential holder can prove they have a valid certificate **without ever revealing what it contains**.

---

## The Three Layers of Data

### Layer 1: On-Chain Public State (Ledger)

Everything in the `ledger` section of `contracts/shield_cert.compact` is permanently visible to anyone reading the Midnight blockchain.

```compact
export ledger credentialHash: Bytes<32>;     // SHA-256 hash — NOT the raw cert
export ledger issuanceCount: Counter;        // How many creds issued
export ledger issuerPublicKey: PublicKey;    // H(domain || secret) — NOT the secret
export ledger revokedCount: Counter;         // How many creds revoked
```

**What an observer sees:** A 32-byte hash, two counters, and a derived key. None of these reveal names, dates of birth, credential types, or any personal information.

### Layer 2: Private Witness Data (Never On-Chain)

Witnesses are callbacks into the user's local DApp. They run **off-chain**, on the user's device. Their return values are used inside ZK circuits but are **never transmitted to the network**.

```compact
witness getCertificateData(): Bytes<32>;   // Full cert: name + DOB + type + ID
witness getIssuerSecret(): IssuerSecretKey; // Secret used to derive the public key
```

**What the network sees:** Nothing. These values are consumed locally to generate a ZK proof.

### Layer 3: ZK Proof Boundary

The Compact compiler automatically enforces the boundary between private and public data:

- Writing witness-derived data directly to the ledger → **compiler error**
- Using `disclose()` on witness data → **explicit acknowledgment** that this is intentional

This is why every ledger write in ShieldCert uses `disclose()`:

```compact
credentialHash = disclose(certHash);         // Hash (safe) — not raw data
issuerPublicKey = disclose(deriveIssuerPublicKey(getIssuerSecret())); // Derived key — not secret
```

---

## What the ZK Proof Proves

When `verifyCredential()` is called, the prover generates a zero-knowledge proof that:

| Statement | How it's proved | What's revealed |
|-----------|-----------------|-----------------|
| "I know the certificate" | `H(certData) == credentialHash` | Only the hash |
| "The issuer is legitimate" | `H(domain + secret) == issuerPublicKey` | Only the derived public key |
| "Cert is not revoked" | `credentialHash != REVOKED_SENTINEL` | Only the boolean outcome |

The verifier receives only **"proof valid"** or **"proof invalid"** — never the underlying data.

---

## Comparison: Traditional vs ZK Credential Verification

| Aspect | Traditional System | ShieldCert (ZK) |
|--------|-------------------|-----------------|
| Verification | Share full certificate PDF | Generate ZK proof |
| Data transmitted | Name, DOB, institution, grade | 32-byte hash + proof |
| Identity exposure | Complete | None |
| Revocation check | Call issuer API | On-chain public counter |
| Forgery resistance | Signature on document | Hash pre-image resistance |
| Regulation (GDPR) | Risky — full PII shared | Safe — no PII transmitted |

---

## Security Properties

1. **Hash pre-image resistance**: Knowing `credentialHash` gives no information about the certificate contents
2. **Domain separation**: `H("shieldcert:issuer:pk:v1" || secret)` — the issuer key can't be replayed across different contracts
3. **ZK soundness**: A prover cannot forge a valid proof without knowing the actual certificate data
4. **Privacy by default**: The Compact compiler *rejects* any accidental disclosure of witness data

---

> This privacy model is enforced at the **compiler level**, not just by convention.
> The Compact compiler will reject any contract that attempts to write witness-derived data to the public ledger without an explicit `disclose()` call.
