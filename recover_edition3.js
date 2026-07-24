import fs from 'fs';

const logFile = '/Users/thephoenyx/.gemini/antigravity/brain/02c50092-d5e9-46a1-9bd8-62107d4b9614/.system_generated/logs/transcript_full.jsonl';
const content = fs.readFileSync(logFile, 'utf8');

const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('cantidad_total') && lines[i].includes('tipo_trabajo')) {
    console.log(`Line ${i}:`, lines[i].substring(0, 1500));
    break;
  }
}
