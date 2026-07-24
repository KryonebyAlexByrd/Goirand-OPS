import fs from 'fs';

const logFile = '/Users/thephoenyx/.gemini/antigravity/brain/02c50092-d5e9-46a1-9bd8-62107d4b9614/.system_generated/logs/transcript_full.jsonl';
const content = fs.readFileSync(logFile, 'utf8');

const lines = content.split('\n');
for (const line of lines) {
  if (line.includes('EDITION CDMX') && line.includes('partidas_cotizacion')) {
    try {
      const obj = JSON.parse(line);
      const str = JSON.stringify(obj);
      const idx = str.indexOf('partidas_cotizacion');
      if (idx !== -1) {
        console.log("Found partidas context:");
        console.log(str.substring(idx - 50, idx + 2000));
      }
    } catch(e) {}
  }
}
