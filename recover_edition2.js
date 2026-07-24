import fs from 'fs';

const logFile = '/Users/thephoenyx/.gemini/antigravity/brain/02c50092-d5e9-46a1-9bd8-62107d4b9614/.system_generated/logs/transcript_full.jsonl';
const content = fs.readFileSync(logFile, 'utf8');

const regex = /"partidas_cotizacion"\s*:\s*(\[\s*\{[\s\S]*?\}\s*\])/g;
let match;
while ((match = regex.exec(content)) !== null) {
  if (match[1].includes('SOFA') || match[1].includes('Silla') || match[1].includes('Mesa') || match[1].includes('ESPEJO')) {
    console.log("FOUND PARTIDAS ARRAY:");
    console.log(match[1].substring(0, 3000));
    break;
  }
}
