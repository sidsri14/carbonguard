/**
 * CarbonGuard IoT Sensor Attestation Engine
 * Validates renewable generation and environmental sensor data with anomaly detection
 */

import { createHash } from 'node:crypto';

export class SensorAttestationEngine {
  constructor(options = {}) {
    this.registeredSensors = new Map();
  }

  /**
   * Registers an authorized IoT sensor device with physical bounds
   */
  registerSensor(sensorId, config) {
    if (!sensorId || !config.maxCapacityKw) {
      throw new Error('Sensor registration requires sensorId and maxCapacityKw');
    }
    this.registeredSensors.set(sensorId, {
      sensorId,
      facilityType: config.facilityType || 'SOLAR_FARM',
      maxCapacityKw: config.maxCapacityKw,
      publicKey: config.publicKey || `pub_${sensorId}`,
      lastTimestamp: 0,
      lastReadingKWh: 0,
    });
  }

  /**
   * Verifies an incoming telemetry packet from an IoT sensor
   */
  verifyTelemetry(telemetry) {
    const { sensorId, timestamp, generationKWh, durationHours = 1 } = telemetry;

    const sensor = this.registeredSensors.get(sensorId);
    if (!sensor) {
      return {
        verified: false,
        reason: 'UNREGISTERED_SENSOR_DEVICE',
        message: `Device '${sensorId}' is not registered in the trusted sensor network`,
      };
    }

    const kwh = Number(generationKWh);
    if (isNaN(kwh) || kwh < 0) {
      return {
        verified: false,
        reason: 'INVALID_GENERATION_VALUE',
        message: 'Generation kWh must be a non-negative number',
      };
    }

    // Physical capacity ceiling check
    const maxPossibleKWh = sensor.maxCapacityKw * durationHours * 1.05; // 5% peak tolerance
    if (kwh > maxPossibleKWh) {
      return {
        verified: false,
        reason: 'ANOMALY_CAPACITY_EXCEEDED',
        message: `Reported ${kwh} kWh exceeds physical facility ceiling of ${maxPossibleKWh} kWh`,
      };
    }

    // Monotonic timestamp check
    if (timestamp <= sensor.lastTimestamp) {
      return {
        verified: false,
        reason: 'REPLAY_ATTACK_DETECTED',
        message: 'Telemetry timestamp must be strictly monotonic',
      };
    }

    // Compute cryptographic attestation hash
    const attestationPayload = JSON.stringify({
      sensorId,
      timestamp,
      generationKWh: kwh,
      facilityType: sensor.facilityType,
    });

    const attestationHash = createHash('sha256').update(attestationPayload).digest('hex');

    // Update sensor state
    sensor.lastTimestamp = timestamp;
    sensor.lastReadingKWh = kwh;

    return {
      verified: true,
      attestationHash,
      generationKWh: kwh,
      timestamp,
      sensorId,
    };
  }
}
