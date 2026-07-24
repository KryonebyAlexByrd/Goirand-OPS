import fs from 'fs';

const logFile = '/Users/thephoenyx/.gemini/antigravity/brain/02c50092-d5e9-46a1-9bd8-62107d4b9614/.system_generated/logs/transcript_full.jsonl';
const content = fs.readFileSync(logFile, 'utf8');

const matches = content.match(/\[\s*\{[^\]]*"tipo_trabajo"[^\]]*\}\s*\]/g);
if (matches) {
  matches.forEach((m, idx) => {
    console.log(`--- MATCH ${idx} ---`);
    console.log(m);
  });
} else {
  console.log("No regex array match found.");
}
