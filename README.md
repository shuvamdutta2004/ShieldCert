# ShieldCert
> Verify credentials without revealing personal information — a Zero-Knowledge Certificate Verification contract on Midnight Network.

---

## Live Demo
👉 **[PASTE LIVE URL AFTER DEPLOYING FRONTEND]**

---

## Contract Address

| Network | Address                                      |
|---------|----------------------------------------------|
| Preprod | `[PASTE ADDRESS AFTER DEPLOY]`               |

> *Note: Preprod contract deployment address is mandatory.*

---

## What This Does

ShieldCert allows an issuer (university, employer, government body, etc.) to register certificate credentials on the Midnight blockchain **without ever exposing personal data**.

When a holder wants to prove they have a valid credential (e.g. a degree, a professional licence, or a background check), they connect their Lace Wallet and generate a zero-knowledge proof locally in their browser. This proof demonstrates that:
1. They know the pre-image of a credential hash stored on-chain.
2. The credential was issued by the legitimate, registered issuer.
3. The credential has not been revoked.

The **verifier** (e.g. a recruiter, border control, exam board) learns **only** whether the proof passed — they never see the holder's name, date of birth, credential type, or any other personal information.

---

## Privacy Model

| Layer | What's stored / visible |
|-------|-------------------------|
| **PUBLIC** (on-chain, visible to anyone) | `credentialHash` — SHA-256 hash commitment to the certificate |
| **PUBLIC** (on-chain, visible to anyone) | `issuanceCount` — number of credentials registered |
| **PUBLIC** (on-chain, visible to anyone) | `issuerPublicKey` — hash-derived public key of the issuer |
| **PUBLIC** (on-chain, visible to anyone) | `revokedCount` — number of revoked credentials |
| **PRIVATE** (witness — never on-chain) | Full certificate data: name, DOB, credential type, raw ID |
| **PRIVATE** (witness — never on-chain) | Issuer's secret key (used to derive the public key locally) |

### What the holder PROVES without revealing:
- ✅ "I possess a certificate whose hash matches the on-chain commitment"
- ✅ "That certificate was issued by the legitimate issuer"
- ✅ "My personal details (name, DOB, credential type) remain completely private"
- ✅ "The credential has not been revoked"

---

## Privacy Claim

> [!IMPORTANT]
> **What an observer sees:** An on-chain observer (or a validator reading the ledger) only sees the `credentialHash`, public counters, and the cryptographic ZK proof.  
> **What an observer CANNOT see:** An observer cannot see the holder's name, certificate type, dates, or the private issuer secret key. The zero-knowledge proof boundary separates the local private state calculation from the verified public transition.

---

## Tech Stack

- **Blockchain:** Midnight Network (Preprod testnet)
- **Smart Contract:** Compact v0.5.1 (compiler 0.31.1)
- **Frontend SDK:** Midnight.js SDK & DApp Connector API v4.0.1
- **UI Framework:** React & Vite
- **Wallet Connector:** Lace Wallet
- **Styling:** Premium Custom Dark-Mode CSS

---

## Prerequisites

Before running this project locally, ensure you have:
1. **Node.js v22+**
2. **Docker Desktop** — running and accessible (check with `docker ps`)
3. **Compact compiler** — installed via the shell installer:
   ```bash
   curl --proto '=https' --tlsv1.2 -LsSf \
     https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
   compact update
   ```
4. **Lace Wallet Extension** — Chrome browser extension configured for Midnight Preprod
5. **Preprod test tokens** — from the [Midnight Preprod Faucet](https://faucet.preprod.midnight.network/)

---

## Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/shuvamdutta2004/ShieldCert.git
cd ShieldCert

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Start the proof server (Docker must be running)
docker run -p 6300:6300 midnightnetwork/proof-server

# 4. Compile the smart contract
compact compile contracts/shield_cert.compact managed/

# 5. Run tests locally
npm test

# 6. Start the React development frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Demo Video

[PLACEHOLDER — I will add the link after recording]

---

## Project Structure

```
ShieldCert/
├── contracts/
│   └── shield_cert.compact     ← ZK contract logic
├── managed/                    ← Auto-generated compiler ZK keys and types
├── src/
│   ├── components/
│   │   ├── WalletConnect.tsx   ← Wallet connect/disconnect component
│   │   └── CircuitCall.tsx     ← Register/Verify ZK circuits caller
│   ├── hooks/
│   │   └── useMidnight.ts      ← Custom Midnight setup hook
│   ├── types/
│   │   └── midnight.d.ts       ← Global window and wallet declarations
│   ├── App.tsx                 ← UI application shell
│   ├── main.tsx                ← Entrypoint
│   └── index.css               ← Core design system styling
├── tests/
│   └── shield_cert.test.ts     ← Test suite
├── screenshots/                ← Screenshots for proof of work
├── package.json
├── vite.config.ts              ← Vite build setup with WASM support
├── vercel.json                 ← Deployment config
└── README.md
```

---

## Screenshots

### Compact Compile Output
> Running `compact compile contracts/shield_cert.compact managed/` — compiles 3 ZK circuits

![compact compile output](screenshots/compact_compile.png)

### Test Suite (11 Tests Passing)
> Running `npm test` — all 11 tests pass across circuit logic, state transitions, and privacy guarantees

![npm test output](screenshots/npm_test.png)

---

## License

MIT

---

> Built for the **Midnight Builder Challenge — Level 2** on [Rise In](https://risein.com)
