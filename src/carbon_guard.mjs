/**
 * CarbonGuard - off-chain MRV gateway and deterministic reference model.
 * On-chain lifecycle enforcement lives in contracts/CarbonCreditRegistry.sol.
 */

import { GHGCalculator } from './ghg_calculator.mjs';
import { SensorAttestationEngine } from './sensor_attestation.mjs';
import { CarbonCreditVerifier } from './credit_verifier.mjs';
import { CarbonAuditLedger } from './audit_ledger.mjs';

export class CarbonGuard {
  constructor() {
    this.ghg = new GHGCalculator();
    this.sensors = new SensorAttestationEngine();
    this.credits = new CarbonCreditVerifier();
    this.ledger = new CarbonAuditLedger();
  }

  /**
   * Calculates Scope 1, 2, or 3 emissions and records to ledger
   */
  calculateEmissions(scope, params) {
    let result;
    if (scope === 1) {
      result = this.ghg.calculateScope1(params.fuelType, params.quantity);
    } else if (scope === 2) {
      result = this.ghg.calculateScope2(params.gridRegion, params.kWh);
    } else if (scope === 3) {
      result = this.ghg.calculateScope3Freight(params.transportMode, params.tonnes, params.distanceKm);
    } else {
      throw new Error(`Unsupported GHG scope: ${scope}`);
    }

    this.ledger.append('GHG_EMISSIONS_CALCULATED', { scope, params, result });
    return result;
  }

  /**
   * Verifies IoT telemetry and stores attestation in ledger
   */
  verifySensorTelemetry(telemetry) {
    const result = this.sensors.verifyTelemetry(telemetry);
    if (result.verified) {
      this.ledger.append('IOT_TELEMETRY_VERIFIED', {
        sensorId: result.sensorId,
        attestationHash: result.attestationHash,
        generationKWh: result.generationKWh,
      });
    } else {
      this.ledger.append('IOT_TELEMETRY_REJECTED', {
        sensorId: telemetry.sensorId,
        reason: result.reason,
      });
    }
    return result;
  }

  /**
   * Mints carbon credit backed by verified attestation
   */
  mintCredit(attestation) {
    const result = this.credits.mintCredit(attestation);
    if (result.success) {
      this.ledger.append('CARBON_CREDIT_MINTED', {
        creditId: result.credit.creditId,
        tonnesCO2e: result.credit.tonnesCO2e,
        attestationHash: result.credit.attestationHash,
      });
    } else {
      this.ledger.append('CARBON_CREDIT_MINT_FAILED', {
        reason: result.reason,
      });
    }
    return result;
  }

  /**
   * Retires carbon credit permanently
   */
  retireCredit(creditId, beneficiary, reason) {
    const result = this.credits.retireCredit(creditId, beneficiary, reason);
    if (result.success) {
      this.ledger.append('CARBON_CREDIT_RETIRED', {
        creditId,
        beneficiary,
        tonnesCO2e: result.retirement.tonnesCO2e,
      });
    } else {
      this.ledger.append('CARBON_CREDIT_RETIREMENT_FAILED', {
        creditId,
        reason: result.reason,
      });
    }
    return result;
  }

  /**
   * Verifies the cryptographic MRV ledger
   */
  verifyLedger() {
    return this.ledger.verifyLedger();
  }
}
