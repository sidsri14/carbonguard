import solc from 'solc';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sourceName = 'CarbonCreditRegistry.sol';
const source = readFileSync(resolve(here, 'contracts', sourceName), 'utf8');

const input = {
  language: 'Solidity',
  sources: { [sourceName]: { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
for (const warning of (output.errors ?? []).filter((entry) => entry.severity === 'warning')) {
  console.warn(warning.formattedMessage.trim());
}

const fatal = (output.errors ?? []).filter((entry) => entry.severity === 'error');
if (fatal.length > 0) {
  for (const error of fatal) console.error(error.formattedMessage);
  process.exit(1);
}

const compiled = output.contracts[sourceName].CarbonCreditRegistry;
const artifact = {
  contractName: 'CarbonCreditRegistry',
  sourceName,
  solcVersion: solc.version(),
  abi: compiled.abi,
  bytecode: `0x${compiled.evm.bytecode.object}`,
  deployedBytecode: `0x${compiled.evm.deployedBytecode.object}`,
};

mkdirSync(resolve(here, 'artifacts'), { recursive: true });
writeFileSync(
  resolve(here, 'artifacts', 'CarbonCreditRegistry.json'),
  `${JSON.stringify(artifact, null, 2)}\n`,
);

console.log(
  `CarbonCreditRegistry: runtime ${compiled.evm.deployedBytecode.object.length / 2}B, ` +
    `deploy ${compiled.evm.bytecode.object.length / 2}B, ${compiled.abi.length} ABI entries`,
);
