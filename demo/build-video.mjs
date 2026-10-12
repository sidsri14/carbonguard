import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const rendered = resolve(import.meta.dirname, 'rendered');
const work = resolve(import.meta.dirname, 'work');
const stitched = resolve(work, 'stitched.mp4');
const subtitles = resolve(work, 'captions.srt');
const output = resolve(import.meta.dirname, 'CarbonGuard_IEEE_ClimateChain_Demo.mp4');

const narration = [
  [
    'CarbonGuard is an M R V audit gateway and Solidity carbon credit registry built for the I E E E ClimateChain Global Hackathon.',
    'The project focuses on a narrow integrity problem: how to keep physical evidence, credit issuance, and retirement state consistent across an off-chain measurement pipeline and an on-chain registry.',
    'It validates bounded renewable energy telemetry, creates cryptographic attestations for accepted readings, and enforces single-use credit evidence plus permanent retirement.',
    'This is an inspectable prototype, not a claim of a deployed production carbon market.',
  ],
  [
    'Putting a carbon credit on a blockchain does not prove that the underlying climate claim is true.',
    'A compromised sensor can report physically impossible generation, an old reading can be replayed, and one attestation can be reused to mint multiple claims.',
    'Even after issuance, fragmented registries can allow the same credit to be presented as retired more than once.',
    'CarbonGuard addresses these failure modes with explicit checks and named rejection reasons.',
    'The design does not ask a language model to make an untraceable policy decision. The security boundary is deterministic and testable.',
  ],
  [
    'The architecture has two trust domains.',
    'Off-chain, the gateway checks whether a sensor is registered, whether the energy value fits its physical capacity over the reported interval, and whether the timestamp moves forward.',
    'An accepted record becomes an S H A two fifty six attestation and enters a tamper-evident audit chain.',
    'On-chain, CarbonCreditRegistry accepts mint calls only from its configured M R V oracle.',
    'It stores the attestation hash, owner, C O two e quantity, metadata hash, issue time, and lifecycle status.',
    'Retirement requires the current owner and changes the status permanently.',
  ],
  [
    'Here is the verified M R V behavior from the local demonstration.',
    'A registered one megawatt solar array reports eight hundred twenty kilowatt hours for one hour. That value is within the configured ceiling, so the gateway accepts it and emits an attestation hash.',
    'The same array then reports three thousand kilowatt hours for one hour.',
    'CarbonGuard blocks the reading with anomaly capacity exceeded because the value is above the one thousand fifty kilowatt hour ceiling, including a five percent tolerance.',
    'A repeated timestamp is also blocked as a replay attack.',
    'Each decision is recorded with its reason so an auditor can reproduce the outcome.',
  ],
  [
    'The Solidity registry owns the invariants that must not depend on application memory.',
    'Minting requires the configured oracle, non-zero identifiers, a positive C O two e quantity, and an attestation hash that has never been used.',
    'Retirement requires an active credit, the current owner, and a beneficiary hash.',
    'After retirement, the credit can never return to active status.',
    'The contract compiles to a one thousand seven hundred ninety six byte optimized runtime with two hundred optimizer runs.',
    'Tests execute the bytecode in a real local E V M instead of mocking contract calls.',
  ],
  [
    'This is the actual local E V M demo output.',
    'The registry deploys to a deterministic test address and accepts a credit representing two hundred forty seven thousand eight hundred grams of C O two e.',
    'A second credit tries to reuse the same attestation hash and reverts with AttestationAlreadyUsed.',
    'The owner then retires the credit, changing its status to Retired and recording the timestamp.',
    'A second retirement attempt reverts with CreditNotActive.',
    'Separate tests prove that a non-oracle cannot mint and a non-owner cannot retire.',
  ],
  [
    'The current repository passes eighteen of eighteen M R V and local E V M tests.',
    'Both the complete dependency audit and the production-only audit report zero vulnerabilities.',
    'GitHub Actions reproduces the build across Node twenty, twenty two, and twenty four.',
    'The limits are deliberate and documented.',
    'There is no public-chain deployment, live sensor fleet, certified emissions-factor governance, or production offset issuance claim.',
    'Before real use, the factor table would need jurisdiction and year specific governance, devices would need hardware-backed signatures, and a recognized registry would need to verify the complete methodology.',
    'CarbonGuard demonstrates the integrity boundary: bounded evidence in, single-use credit state on-chain, and permanent retirement out.',
  ],
];

function run(program, args) {
  const result = spawnSync(program, args, { cwd: root, encoding: 'utf8', stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${program} exited with status ${result.status}`);
}

function duration(path) {
  const result = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', path],
    { cwd: root, encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error(`ffprobe failed for ${path}`);
  return Number(result.stdout.trim());
}

function srtTime(seconds) {
  const millis = Math.max(0, Math.round(seconds * 1000));
  const ms = millis % 1000;
  const totalSeconds = Math.floor(millis / 1000);
  const sec = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const min = totalMinutes % 60;
  const hour = Math.floor(totalMinutes / 60);
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });

const segments = [];
const captionRows = [];
let captionIndex = 1;
let timeline = 0;

for (let index = 0; index < narration.length; index += 1) {
  const slideNumber = index + 1;
  const text = narration[index].join(' ');
  const narrationFile = resolve(work, `narration-${slideNumber}.txt`);
  const audio = resolve(work, `narration-${slideNumber}.wav`);
  const segment = resolve(work, `segment-${slideNumber}.mp4`);
  writeFileSync(narrationFile, `${text}\n`);

  run('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'lavfi', '-i', `flite=textfile='demo/work/narration-${slideNumber}.txt':voice=slt`,
    '-ar', '48000', '-ac', '1', audio,
  ]);

  const spoken = duration(audio);
  const segmentDuration = spoken + 1.25;
  const fadeStart = Math.max(0, spoken - 0.6).toFixed(3);
  run('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-loop', '1', '-framerate', '30', '-i', resolve(rendered, `slide-${slideNumber}.png`),
    '-i', audio,
    '-filter_complex', `[0:v]scale=1280:720,format=yuv420p[v];[1:a]afade=t=in:st=0:d=0.2,afade=t=out:st=${fadeStart}:d=0.55,apad=pad_dur=1.25[a]`,
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-tune', 'stillimage',
    '-c:a', 'aac', '-b:a', '128k', '-r', '30', '-t', segmentDuration.toFixed(3),
    '-movflags', '+faststart', segment,
  ]);
  segments.push(segment);

  const words = narration[index].map((sentence) => sentence.split(/\s+/).length);
  const totalWords = words.reduce((sum, count) => sum + count, 0);
  let sentenceStart = timeline + 0.15;
  for (let sentenceIndex = 0; sentenceIndex < narration[index].length; sentenceIndex += 1) {
    const share = spoken * (words[sentenceIndex] / totalWords);
    const sentenceEnd = sentenceStart + share;
    captionRows.push(
      `${captionIndex}\n${srtTime(sentenceStart)} --> ${srtTime(sentenceEnd)}\n${narration[index][sentenceIndex]}\n`,
    );
    captionIndex += 1;
    sentenceStart = sentenceEnd;
  }
  timeline += segmentDuration;
}

const concatFile = resolve(work, 'segments.txt');
writeFileSync(
  concatFile,
  `${segments.map((path) => `file '${path.replaceAll('\\', '/')}'`).join('\n')}\n`,
);
writeFileSync(subtitles, `${captionRows.join('\n')}\n`);

run('ffmpeg', [
  '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', concatFile,
  '-c', 'copy', stitched,
]);
run('ffmpeg', [
  '-y', '-loglevel', 'error', '-i', stitched,
  '-vf', "subtitles=demo/work/captions.srt:force_style='FontName=Arial,FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00101816,BorderStyle=3,BackColour=&H9A07100F,Outline=1,Shadow=0,MarginV=28'",
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
  '-c:a', 'copy', '-movflags', '+faststart', output,
]);

console.log(`Saved ${output}`);
console.log(`Duration: ${duration(output).toFixed(3)} seconds`);
