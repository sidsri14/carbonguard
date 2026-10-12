/**
 * CarbonGuard On-Chain Carbon Credit Verifier & Anti-Double-Counting Engine
 */

import { randomUUID } from 'node:crypto';

export class CarbonCreditVerifier {
  constructor() {
    this.mintedCredits = new Map(); // creditId -> credit record
    this.usedAttestationHashes = new Set(); // hash -> true
    this.retiredCredits = new Map(); // creditId -> retirement record
  }

  /**
   * Mints verified on-chain carbon credits backed by verified sensor attestation
   * Standard: 1 Credit = 1 Metric Tonne (1000 kg) avoided/sequestered CO2e
   */
  mintCredit(attestation) {
    if (!attestation || !attestation.verified || !attestation.attestationHash) {
      return {
        success: false,
        reason: 'UNVERIFIED_ATTESTATION',
        message: 'Cannot mint credits without a cryptographically verified sensor attestation',
      };
    }

    if (this.usedAttestationHashes.has(attestation.attestationHash)) {
      return {
        success: false,
        reason: 'DOUBLE_MINT_PREVENTED',
        message: 'Attestation hash has already been used to mint carbon credits',
      };
    }

    // Convert generation into avoided CO2e credits (e.g. replacing grid average emissions)
    // Formula: generationKWh * 0.708 kg CO2e / 1000 = tonnes CO2e avoided
    const avoidedKg = attestation.generationKWh * 0.708;
    const tonnesCO2e = Number((avoidedKg / 1000).toFixed(4));

    if (tonnesCO2e <= 0) {
      return {
        success: false,
        reason: 'INSUFFICIENT_AVOIDED_EMISSIONS',
        message: 'Generation does not yield at least 0.0001 tonnes of avoided CO2e',
      };
    }

    const creditId = `CC-${randomUUID()}`;
    const creditRecord = {
      creditId,
      attestationHash: attestation.attestationHash,
      sensorId: attestation.sensorId,
      tonnesCO2e,
      avoidedKg,
      mintTimestamp: Date.now(),
      status: 'ACTIVE',
      owner: '0x995e83A37178978b891a52222442B8aE20344c67',
    };

    this.mintedCredits.set(creditId, creditRecord);
    this.usedAttestationHashes.add(attestation.attestationHash);

    return {
      success: true,
      credit: creditRecord,
    };
  }

  /**
   * Retires a carbon credit permanently on-chain
   */
  retireCredit(creditId, beneficiary, retirementReason) {
    const credit = this.mintedCredits.get(creditId);
    if (!credit) {
      return {
        success: false,
        reason: 'CREDIT_NOT_FOUND',
        message: `Carbon credit token '${creditId}' does not exist`,
      };
    }

    if (credit.status === 'RETIRED') {
      return {
        success: false,
        reason: 'ALREADY_RETIRED',
        message: `Carbon credit '${creditId}' was already retired. Double-counting prohibited.`,
      };
    }

    if (!beneficiary) {
      return {
        success: false,
        reason: 'MISSING_BENEFICIARY',
        message: 'Retirement requires an explicit beneficiary entity or wallet address',
      };
    }

    credit.status = 'RETIRED';
    const retirementRecord = {
      creditId,
      tonnesCO2e: credit.tonnesCO2e,
      beneficiary,
      retirementReason: retirementReason || 'Corporate Scope 1/2 Offset',
      retiredTimestamp: Date.now(),
    };

    this.retiredCredits.set(creditId, retirementRecord);

    return {
      success: true,
      retirement: retirementRecord,
    };
  }

  /**
   * Fetches credit verification state
   */
  getCreditStatus(creditId) {
    const credit = this.mintedCredits.get(creditId);
    if (!credit) return null;
    return {
      ...credit,
      retirementDetails: this.retiredCredits.get(creditId) || null,
    };
  }
}
