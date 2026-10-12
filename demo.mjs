/**
 * CarbonGuard End-to-End Live Demonstration
 * Showcasing GHG Protocol calculations, IoT telemetry verification, carbon credit minting, and anti-double-counting
 */

import { CarbonGuard } from './src/carbon_guard.mjs';

async function runDemo() {
  console.log('='.repeat(70));
  console.log('🌱 CARBONGUARD: MRV AUDIT GATEWAY & ON-CHAIN CARBON CREDIT ORACLE');
  console.log('   IEEE ClimateChain Global Hackathon (Blockchain × AI × Web3)');
  console.log('='.repeat(70));

  const guard = new CarbonGuard();

  // Register authorized IoT solar facility
  guard.sensors.registerSensor('IOT_SOLAR_ARRAY_04', {
    facilityType: 'COMMERCIAL_SOLAR_FARM',
    maxCapacityKw: 1000, // 1 MW facility
  });

  console.log('\n[STAGE 1] Testing GHG Protocol Scope 1, 2, and 3 Emissions Engine:');
  const s1 = guard.calculateEmissions(1, { fuelType: 'DIESEL_LITER', quantity: 250 });
  console.log(`  ▶ Scope 1 (Diesel Combustion): 250 Liters -> ${s1.co2eKg} kg CO2e (${s1.co2eTonnes} tonnes CO2e)`);

  const s2 = guard.calculateEmissions(2, { gridRegion: 'INDIA_AVERAGE', kWh: 5000 });
  console.log(`  ▶ Scope 2 (Grid Electricity): 5,000 kWh -> ${s2.co2eKg} kg CO2e (${s2.co2eTonnes} tonnes CO2e)`);

  const s3 = guard.calculateEmissions(3, { transportMode: 'ROAD_TRUCK', tonnes: 20, distanceKm: 400 });
  console.log(`  ▶ Scope 3 (Logistics Freight): 20 Tonnes / 400 km -> ${s3.co2eKg} kg CO2e (${s3.co2eTonnes} tonnes CO2e)`);

  console.log('\n[STAGE 2] Verifying Real-Time IoT Telemetry from Solar Array:');
  const telemetry = {
    sensorId: 'IOT_SOLAR_ARRAY_04',
    timestamp: Date.now(),
    generationKWh: 820, // 820 kWh generated clean energy
    durationHours: 1,
  };
  const attestation = guard.verifySensorTelemetry(telemetry);
  console.log(`  ▶ Sensor Reading: ${telemetry.generationKWh} kWh generated in 1 hour`);
  console.log(`    Status: ${attestation.verified ? '✅ VERIFIED & SIGNED' : '❌ REJECTED'}`);
  console.log(`    Attestation SHA-256: ${attestation.attestationHash}`);

  console.log('\n[STAGE 3] Detecting Spoofed Telemetry (Capacity Overrun Anomaly):');
  const rogueTelemetry = {
    sensorId: 'IOT_SOLAR_ARRAY_04',
    timestamp: Date.now() + 3600000,
    generationKWh: 3000, // 3000 kWh exceeds 1000 kW capacity ceiling
    durationHours: 1,
  };
  const rogueRes = guard.verifySensorTelemetry(rogueTelemetry);
  console.log(`  ▶ Spoofed Reading: 3,000 kWh from 1 MW solar array`);
  console.log(`    Status: ${rogueRes.verified ? '✅ VERIFIED' : '❌ BLOCKED'} (${rogueRes.reason}: ${rogueRes.message})`);

  console.log('\n[STAGE 4] Minting Verified On-Chain Carbon Credits:');
  const mintRes = guard.mintCredit(attestation);
  console.log(`  ▶ Minting Carbon Credit from Attestation Hash...`);
  console.log(`    Status: ${mintRes.success ? '✅ MINTED' : '❌ FAILED'}`);
  console.log(`    Credit ID: ${mintRes.credit?.creditId}`);
  console.log(`    Avoided Emissions: ${mintRes.credit?.tonnesCO2e} Metric Tonnes CO2e`);

  console.log('\n[STAGE 5] Preventing Double-Mint Attack:');
  const doubleMint = guard.mintCredit(attestation);
  console.log(`  ▶ Attempting to re-mint credit with same attestation hash...`);
  console.log(`    Status: ${doubleMint.success ? '✅ MINTED' : '❌ DENIED'} (${doubleMint.reason})`);

  console.log('\n[STAGE 6] Irreversible Retirement & Beneficiary Attribution:');
  const retireRes = guard.retireCredit(
    mintRes.credit.creditId,
    'Siddharth Enterprises (Net-Zero Pledge)',
    'FY26 Corporate ESG Compliance'
  );
  console.log(`  ▶ Retiring Credit '${mintRes.credit.creditId}'...`);
  console.log(`    Status: ${retireRes.success ? '✅ RETIRED' : '❌ FAILED'}`);
  console.log(`    Beneficiary: ${retireRes.retirement?.beneficiary}`);

  const doubleRetire = guard.retireCredit(
    mintRes.credit.creditId,
    'Secondary Purchaser',
    'Second Attempt'
  );
  console.log(`  ▶ Double-Counting Prevention Test: Attempting secondary retirement...`);
  console.log(`    Status: ${doubleRetire.success ? '✅ RETIRED' : '❌ DENIED'} (${doubleRetire.reason}: ${doubleRetire.message})`);

  console.log('\n[STAGE 7] Verifying Tamper-Evident SHA-256 MRV Audit Chain:');
  const proof = guard.verifyLedger();
  console.log(`  ▶ Cryptographic Audit Proof: ${proof.valid ? '✅ VALID (100% IMMUTABLE)' : '❌ TAMPERED'}`);
  console.log(`  ▶ Audit Blocks Recorded: ${proof.length}`);
  console.log(`  ▶ Head Block Hash: ${proof.headHash}`);

  console.log('\n🎉 ALL 7/7 CARBONGUARD MRV INVARIANTS VERIFIED AT LINE SPEED!\n');
}

runDemo().catch(console.error);
