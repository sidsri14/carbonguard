import test from 'node:test';
import assert from 'node:assert/strict';
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
  readFileSync(new URL('../artifacts/CarbonCreditRegistry.json', import.meta.url), 'utf8'),
);

const ORACLE = createAddressFromString('0x1000000000000000000000000000000000000001');
const OWNER = createAddressFromString('0x2000000000000000000000000000000000000002');
const STRANGER = createAddressFromString('0x3000000000000000000000000000000000000003');
const issuedAt = 1_790_000_000n;

const id = (value) => keccak256(stringToHex(value));
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

async function setup() {
  const vm = await createVM();
  const deployData = encodeDeployData({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [ORACLE.toString()],
  });
  const deployed = await vm.evm.runCall({
    caller: ORACLE,
    data: hexToBytes(deployData),
    gasLimit: 10_000_000n,
    block: blockAt(issuedAt),
  });
  assert.equal(deployed.execResult.exceptionError, undefined, 'contract deployment failed');

  const call = async (functionName, args = [], options = {}) => {
    const data = encodeFunctionData({ abi: artifact.abi, functionName, args });
    return vm.evm.runCall({
      caller: options.caller ?? ORACLE,
      to: deployed.createdAddress,
      data: hexToBytes(data),
      gasLimit: 5_000_000n,
      block: blockAt(options.timestamp ?? issuedAt),
    });
  };

  const read = async (functionName, args = []) => {
    const result = await call(functionName, args);
    assert.equal(result.execResult.exceptionError, undefined);
    return decodeFunctionResult({
      abi: artifact.abi,
      functionName,
      data: bytesToHex(result.execResult.returnValue),
    });
  };

  const expectRevert = async (promise, errorName) => {
    const result = await promise;
    assert.ok(result.execResult.exceptionError, `expected ${errorName} revert`);
    const decoded = decodeErrorResult({
      abi: artifact.abi,
      data: bytesToHex(result.execResult.returnValue),
    });
    assert.equal(decoded.errorName, errorName);
    return decoded.args;
  };

  return { call, expectRevert, read };
}

test('oracle mints an attestation-backed active credit', async () => {
  const { call, read } = await setup();
  const creditId = id('credit-001');
  const attestationHash = id('sensor-reading-001');
  const metadataHash = id('ipfs://carbon-metadata-001');

  const result = await call('mint', [
    creditId,
    attestationHash,
    OWNER.toString(),
    247_800n,
    metadataHash,
  ]);
  assert.equal(result.execResult.exceptionError, undefined);
  assert.equal(await read('usedAttestations', [attestationHash]), true);

  const credit = await read('getCredit', [creditId]);
  assert.equal(credit.owner.toLowerCase(), OWNER.toString().toLowerCase());
  assert.equal(credit.attestationHash, attestationHash);
  assert.equal(credit.gramsCO2e, 247_800n);
  assert.equal(credit.issuedAt, issuedAt);
  assert.equal(credit.status, 1);
});

test('non-oracle mint fails closed', async () => {
  const { call, expectRevert } = await setup();
  await expectRevert(
    call(
      'mint',
      [id('credit-unauthorized'), id('reading-unauthorized'), OWNER.toString(), 1n, id('meta')],
      { caller: STRANGER },
    ),
    'NotOracle',
  );
});

test('the same attestation cannot mint a second credit', async () => {
  const { call, expectRevert } = await setup();
  const attestationHash = id('same-reading');
  await call('mint', [id('credit-a'), attestationHash, OWNER.toString(), 1_000n, id('meta-a')]);
  const [reusedHash] = await expectRevert(
    call('mint', [id('credit-b'), attestationHash, OWNER.toString(), 1_000n, id('meta-b')]),
    'AttestationAlreadyUsed',
  );
  assert.equal(reusedHash, attestationHash);
});

test('only the credit owner can retire an active credit', async () => {
  const { call, expectRevert } = await setup();
  const creditId = id('credit-owner-check');
  await call('mint', [creditId, id('reading-owner-check'), OWNER.toString(), 1_000n, id('meta')]);
  await expectRevert(
    call('retire', [creditId, id('beneficiary'), id('reason')], { caller: STRANGER }),
    'NotCreditOwner',
  );
});

test('retirement is irreversible and records its timestamp', async () => {
  const { call, expectRevert, read } = await setup();
  const creditId = id('credit-retire-once');
  await call('mint', [creditId, id('reading-retire-once'), OWNER.toString(), 1_000n, id('meta')]);

  const retiredAt = issuedAt + 60n;
  const result = await call('retire', [creditId, id('beneficiary'), id('net-zero-2026')], {
    caller: OWNER,
    timestamp: retiredAt,
  });
  assert.equal(result.execResult.exceptionError, undefined);

  const credit = await read('getCredit', [creditId]);
  assert.equal(credit.status, 2);
  assert.equal(credit.retiredAt, retiredAt);
  await expectRevert(
    call('retire', [creditId, id('second-beneficiary'), id('second-reason')], { caller: OWNER }),
    'CreditNotActive',
  );
});
