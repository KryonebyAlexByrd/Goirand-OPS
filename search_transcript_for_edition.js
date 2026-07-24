import fs from 'fs';

const logFile = '/Users/thephoenyx/.gemini/antigravity/brain/02c50092-d5e9-46a1-9bd8-62107d4b9614/.system_generated/logs/transcript_full.jsonl';
const content = fs.readFileSync(logFile, 'utf8');

const lines = content.split('\n');
console.log("Total lines in full transcript:", lines.length);

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('EDITION') || line.includes('PRY-161374')) {
    if (line.includes('partidas_cotizacion') || line.includes('tipo_trabajo')) {
      console.log(`\n=== MATCH AT LINE ${i} ===`);
      console.log(line.substring(0, 1500));
    }
  }
}
