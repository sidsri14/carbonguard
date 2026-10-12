import test from 'node:test';
import assert from 'node:assert/strict';
import { CarbonGuard } from '../src/carbon_guard.mjs';

test('CarbonGuard MRV & Carbon Credit Verification Suite', async (t) => {
  const guard = new CarbonGuard();

  // Register an authorized IoT solar facility
  guard.sensors.registerSensor('SENSOR_SOLAR_RAJASTHAN_01', {
    facilityType: 'SOLAR_FARM',
    maxCapacityKw: 500, // 500 kW capacity
  });

  await t.test('Test 1: Scope 1 diesel combustion calculation matches GHG Protocol', () => {
    // 100 liters diesel * 2.68 kg/L = 268 kg CO2e = 0.268 tonnes
    const res = guard.calculateEmissions(1, { fuelType: 'DIESEL_LITER', quantity: 100 });
    assert.equal(res.scope, 1);
    assert.equal(res.co2eKg, 268);
    assert.equal(res.co2eTonnes, 0.268);
  });

  await t.test('Test 2: Scope 2 electricity emissions calculated with regional factors', () => {
    // 1000 kWh in EU (0.255 factor) = 255 kg CO2e = 0.255 tonnes
    const euRes = guard.calculateEmissions(2, { gridRegion: 'EU_AVERAGE', kWh: 1000 });
    assert.equal(euRes.co2eKg, 255);
    assert.equal(euRes.co2eTonnes, 0.255);

    // 1000 kWh in India (0.708 factor) = 708 kg CO2e = 0.708 tonnes
    const inRes = guard.calculateEmissions(2, { gridRegion: 'INDIA_AVERAGE', kWh: 1000 });
    assert.equal(inRes.co2eKg, 708);
  });

  await t.test('Test 3: Scope 3 freight logistics emissions calculated', () => {
    // 10 tonnes * 500 km * 0.105 (truck) = 525 kg CO2e
    const res = guard.calculateEmissions(3, {
      transportMode: 'ROAD_TRUCK',
      tonnes: 10,
      distanceKm: 500,
    });
    assert.equal(res.co2eKg, 525);
  });

  await t.test('Test 4: Invalid/negative emission inputs fail-closed', () => {
    assert.throws(() => {
      guard.calculateEmissions(1, { fuelType: 'DIESEL_LITER', quantity: -10 });
    }, /INVALID_QUANTITY/);

    assert.throws(() => {
      guard.calculateEmissions(1, { fuelType: 'UNKNOWN_FUEL_TYPE', quantity: 10 });
    }, /UNSUPPORTED_FUEL_TYPE/);
  });

  let validAttestation;

  await t.test('Test 5: Legitimate IoT telemetry from registered solar farm verified', () => {
    const telemetry = {
      sensorId: 'SENSOR_SOLAR_RAJASTHAN_01',
      timestamp: 1728000000,
      generationKWh: 350, // within 500 kW capacity * 1h
      durationHours: 1,
    };
    validAttestation = guard.verifySensorTelemetry(telemetry);
    assert.equal(validAttestation.verified, true);
    assert.ok(validAttestation.attestationHash);
  });

  await t.test('Test 6: Telemetry from unregistered sensor rejected', () => {
    const telemetry = {
      sensorId: 'UNREGISTERED_ROGUE_DEVICE',
      timestamp: 1728000000,
      generationKWh: 100,
    };
    const res = guard.verifySensorTelemetry(telemetry);
    assert.equal(res.verified, false);
    assert.equal(res.reason, 'UNREGISTERED_SENSOR_DEVICE');
  });

  await t.test('Test 7: Generation exceeding physical capacity flagged as anomaly', () => {
    const telemetry = {
      sensorId: 'SENSOR_SOLAR_RAJASTHAN_01',
      timestamp: 1728003600,
      generationKWh: 1500, // exceeds 500 kW capacity
      durationHours: 1,
    };
    const res = guard.verifySensorTelemetry(telemetry);
    assert.equal(res.verified, false);
    assert.equal(res.reason, 'ANOMALY_CAPACITY_EXCEEDED');
  });

  await t.test('Test 8: Replay attack with non-monotonic timestamp rejected', () => {
    const telemetry = {
      sensorId: 'SENSOR_SOLAR_RAJASTHAN_01',
      timestamp: 1728000000, // duplicate timestamp <= lastTimestamp
      generationKWh: 200,
    };
    const res = guard.verifySensorTelemetry(telemetry);
    assert.equal(res.verified, false);
    assert.equal(res.reason, 'REPLAY_ATTACK_DETECTED');
  });

  let mintedCredit;

  await t.test('Test 9: Carbon credit is minted against verified sensor attestation', () => {
    const mintRes = guard.mintCredit(validAttestation);
    assert.equal(mintRes.success, true);
    mintedCredit = mintRes.credit;
    assert.ok(mintedCredit.creditId.startsWith('CC-'));
    assert.equal(mintedCredit.status, 'ACTIVE');
    assert.ok(mintedCredit.tonnesCO2e > 0);
  });

  await t.test('Test 10: Double-mint with same attestation hash is strictly blocked', () => {
    const secondMint = guard.mintCredit(validAttestation);
    assert.equal(secondMint.success, false);
    assert.equal(secondMint.reason, 'DOUBLE_MINT_PREVENTED');
  });

  await t.test('Test 11: Credit retirement is permanent and prevents double-counting', () => {
    const retireRes = guard.retireCredit(
      mintedCredit.creditId,
      'Acme Green Corp',
      'Net-Zero FY26 Scope 2 Offset'
    );
    assert.equal(retireRes.success, true);
    assert.equal(retireRes.retirement.beneficiary, 'Acme Green Corp');

    // Attempt second retirement
    const secondRetire = guard.retireCredit(
      mintedCredit.creditId,
      'Another Beneficiary',
      'Double Offset Attempt'
    );
    assert.equal(secondRetire.success, false);
    assert.equal(secondRetire.reason, 'ALREADY_RETIRED');
  });

  await t.test('Test 12: Tamper-evident SHA-256 MRV audit ledger verifies integrity', () => {
    const proof = guard.verifyLedger();
    assert.equal(proof.valid, true);
    assert.ok(proof.length >= 6);
  });
});
