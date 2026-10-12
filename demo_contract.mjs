import { readFileSync } from 'node:fs';
import { createVM } from '@ethereumjs/vm';
import {
  bytesToHex,
  createAddressFromString,
  createZeroAddress,
  hexToBytes,
} from '@ethereumjs/util';
import {
  decodeErrorResult,
  decodeFunctionResult,
  encodeDeployData,
  encodeFunctionData,
  keccak256,
  stringToHex,
} from 'viem';

const artifact = JSON.parse(
  readFileSync(new URL('./artifacts/CarbonCreditRegistry.json', import.meta.url), 'utf8'),
);
const oracle = createAddressFromString('0x1000000000000000000000000000000000000001');
const owner = createAddressFromString('0x2000000000000000000000000000000000000002');
const now = 1_790_000_000n;
const hash = (value) => keccak256(stringToHex(value));
const blockAt = (timestamp) => ({
  header: {
    number: 1n,
    coinbase: createZeroAddress(),
    timestamp,
    difficulty: 0n,
    prevRandao: new Uint8Array(32),
    gasLimit: 30_000_000n,
    baseFeePerGas: 0n,
  },
});

const vm = await createVM();
const deployed = await vm.evm.runCall({
  caller: oracle,
  data: hexToBytes(
    encodeDeployData({ abi: artifact.abi, bytecode: artifact.bytecode, args: [oracle.toString()] }),
  ),
  gasLimit: 10_000_000n,
  block: blockAt(now),
});
if (deployed.execResult.exceptionError) throw deployed.execResult.exceptionError;

const call = async (functionName, args = [], caller = oracle, timestamp = now) =>
  vm.evm.runCall({
    caller,
    to: deployed.createdAddress,
    data: hexToBytes(encodeFunctionData({ abi: artifact.abi, functionName, args })),
    gasLimit: 5_000_000n,
    block: blockAt(timestamp),
  });

const creditId = hash('CARBONGUARD-DEMO-CREDIT-001');
const attestationHash = hash('IOT-SENSOR-READING-001');

console.log('CarbonGuard local-EVM registry demo');
console.log(`Contract: ${deployed.createdAddress}`);

const minted = await call('mint', [
  creditId,
  attestationHash,
  owner.toString(),
  247_800n,
  hash('ipfs://carbon-metadata-001'),
]);
if (minted.execResult.exceptionError) throw minted.execResult.exceptionError;
console.log('Mint: accepted (247,800 grams CO2e)');

const duplicate = await call('mint', [
  hash('CARBONGUARD-DEMO-CREDIT-002'),
  attestationHash,
  owner.toString(),
  247_800n,
  hash('ipfs://carbon-metadata-002'),
]);
const duplicateError = decodeErrorResult({
  abi: artifact.abi,
  data: bytesToHex(duplicate.execResult.returnValue),
});
console.log(`Duplicate attestation: blocked (${duplicateError.errorName})`);

const retiredAt = now + 60n;
const retired = await call(
  'retire',
  [creditId, hash('City of Lucknow climate program'), hash('verified retirement demo')],
  owner,
  retiredAt,
);
if (retired.execResult.exceptionError) throw retired.execResult.exceptionError;

const stateResult = await call('getCredit', [creditId]);
const state = decodeFunctionResult({
  abi: artifact.abi,
  functionName: 'getCredit',
  data: bytesToHex(stateResult.execResult.returnValue),
});
console.log(`Retirement: recorded at ${state.retiredAt}; status=${state.status} (Retired)`);

const secondRetirement = await call(
  'retire',
  [creditId, hash('second beneficiary'), hash('duplicate attempt')],
  owner,
  retiredAt + 60n,
);
const retirementError = decodeErrorResult({
  abi: artifact.abi,
  data: bytesToHex(secondRetirement.execResult.returnValue),
});
console.log(`Second retirement: blocked (${retirementError.errorName})`);
