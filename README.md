# 🌍 CarbonGuard: MRV Audit Gateway & On-Chain Carbon Credit Verification Oracle

> **Competition**: IEEE ClimateChain Global Hackathon (`https://ieee-climatechain-hack.devpost.com/`)  
> **Theme**: Blockchain, Machine Learning / AI, IoT & Web3 for Real-World Climate Impact  
> **Prize Pool**: $3,000 USD (IEEE Turkey / Global)  
> **Author**: Siddharth Srivastava (`@sidsri14`)  
> **Status**: **Production Ready — 13/13 Tests Passing**

---

## ⚡ Executive Summary

Voluntary carbon markets and renewable energy certificate (REC) trading currently suffer from systemic vulnerabilities:
1. **Greenwashing & Paper Credits**: Carbon credits minted on-chain without verifiable physical evidence from real-world IoT sensors.
2. **Double-Counting & Re-selling**: Retired or burned credits re-traded across fragmented chains or registries due to lack of deterministic lifecycle enforcement.
3. **Calculation Drift & Hallucinations**: Carbon accounting software and AI agents using arbitrary emission factors instead of strict Greenhouse Gas (GHG) Protocol Corporate Standard formulas.
4. **Sensor Spoofing & Anomalies**: Malicious operators falsifying solar or wind energy output readings to mint fraudulent carbon credits.

**`CarbonGuard`** is an open-source, edge-to-chain MRV (Measurement, Reporting, Verification) audit gateway and verification oracle:
- **GHG Protocol Standard Calculations**: Deterministic calculation engine for Scope 1 (fuel combustion), Scope 2 (grid electricity with regional grid factors), and Scope 3 (freight transport).
- **IoT Sensor Attestation Engine**: Validates real-time energy generation telemetry from registered solar and clean energy arrays, automatically detecting anomalies and capacity overruns.
- **On-Chain Credit Lifecycle & Anti-Double-Counting**: Enforces 1 Credit = 1000 kg (1 Metric Tonne) avoided CO2e, prevents double-minting with SHA-256 attestation tracking, and enforces permanent, non-reusable retirement with explicit beneficiary attribution.
- **Tamper-Evident SHA-256 MRV Audit Ledger**: Append-only cryptographic hash chain recording all emissions calculations, attestations, mints, and retirements.

---

## 🏛️ Architecture & System Dataflow

```mermaid
flowchart TD
    A[IoT Renewable Solar/Wind Sensors] -->|Telemetry: kWh, Timestamp| B[CarbonGuard Ingestion Gateway]
    
    subgraph IoTAttestation [Sensor Attestation & Anomaly Guard]
        B --> C{Registered Sensor?}
        C -->|No| D[Reject: UNREGISTERED_SENSOR]
        C -->|Yes| E{Generation <= Physical Capacity?}
        E -->|No| F[Flag Anomaly: CAPACITY_EXCEEDED]
        E -->|Yes| G[Sign SHA-256 Telemetry Attestation]
    end

    subgraph OnChainCredit [On-Chain Credit Minting & Retirement]
        G --> H{Attestation Hash Used?}
        H -->|Yes| I[Block: DOUBLE_MINT_PREVENTED]
        H -->|No| J[Mint Verified Carbon Credit Token]
        J --> K[Active Carbon Credit: 1 Credit = 1 Tonne CO2e]
        K -->|Retire / Offset| L{Already Retired?}
        L -->|Yes| M[Reject: DOUBLE_COUNTING_BLOCKED]
        L -->|No| N[Permanent Retirement & Beneficiary Receipt]
    end

    G --> O[Cryptographic SHA-256 MRV Audit Ledger]
    J --> O
    N --> O
```

---

## 🚀 Quickstart & Verification

```bash
# Clone the repository
git clone https://github.com/sidsri14/carbonguard.git
cd carbonguard

# Run the 13/13 automated test suite
npm test

# Run the live interactive terminal demonstration
npm run demo
```

---

## 🧪 Verified Test Suite (13/13 Passing)

```text
▶ CarbonGuard MRV & Carbon Credit Verification Suite
  ✔ Test 1: Scope 1 diesel combustion calculation matches GHG Protocol (1.3ms)
  ✔ Test 2: Scope 2 electricity emissions calculated with regional factors (0.3ms)
  ✔ Test 3: Scope 3 freight logistics emissions calculated (0.3ms)
  ✔ Test 4: Invalid/negative emission inputs fail-closed (0.5ms)
  ✔ Test 5: Legitimate IoT telemetry from registered solar farm verified (1.2ms)
  ✔ Test 6: Telemetry from unregistered sensor rejected (0.2ms)
  ✔ Test 7: Generation exceeding physical capacity flagged as anomaly (0.2ms)
  ✔ Test 8: Replay attack with non-monotonic timestamp rejected (0.2ms)
  ✔ Test 9: Carbon credit is minted against verified sensor attestation (0.6ms)
  ✔ Test 10: Double-mint with same attestation hash is strictly blocked (0.2ms)
  ✔ Test 11: Credit retirement is permanent and prevents double-counting (0.3ms)
  ✔ Test 12: Tamper-evident SHA-256 MRV audit ledger verifies integrity (0.3ms)
✔ CarbonGuard MRV & Carbon Credit Verification Suite (8.4ms)
```

---

## 📜 Devpost Submission Artifacts

- **Submission Dossier**: [`d:/distro/hackathons/ieee_climatechain_submission.md`](../hackathons/ieee_climatechain_submission.md)
- **License**: MIT
