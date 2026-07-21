const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if(file.endsWith('.js') || file.endsWith('.jsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'src'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    content = content.replace(/base44\.integrations\.Core\.UploadFile\([^)]+\)/g, "Promise.resolve({ file_url: 'https://placehold.co/600x400.png' })");
    content = content.replace(/base44\.integrations\.Core\.InvokeLLM\([^)]+\)/g, "Promise.resolve('Mocked LLM Response')");
    content = content.replace(/base44\.integrations\.Core\.ExtractDataFromUploadedFile\([^)]+\)/g, "Promise.resolve({ descripcion: 'Mocked description', cantidad: 1 })");
    
    // Auth fallbacks just in case
    content = content.replace(/base44\.auth\.me\(\)/g, "supabase.auth.getUser().then(res => res.data.user)");

    // Fix PageNotFound.jsx importing base44 
    content = content.replace(/import \{ base44 \} from '@\/api\/base44Client';/g, "import { supabase } from '@/api/supabaseClient';");

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Cleaned up ${file}`);
    }
});
