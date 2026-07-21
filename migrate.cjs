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

function toSnakeCase(str) {
    // Supabase tables might be snake_case or whatever we saw:
    // automatizacionWhatsApp, cliente, registro_trabajo, trabajador, proyecto, contratista
    // The entity names are: Proyecto, Cliente, RegistroTrabajo, Trabajador, Contratista, AutomatizacionWhatsApp, CatalogoTrabajo
    const map = {
        'Proyecto': 'proyecto',
        'Cliente': 'cliente',
        'RegistroTrabajo': 'registro_trabajo',
        'Trabajador': 'trabajador',
        'Contratista': 'contratista',
        'AutomatizacionWhatsApp': 'automatizacionWhatsApp',
        'CatalogoTrabajo': 'catalogo_trabajo' // assuming this one
    };
    return map[str] || str;
}

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    // Imports
    content = content.replace(/import \{ base44 \} from "@\/api\/base44Client";/g, 'import { supabase } from "@/api/supabaseClient";');
    content = content.replace(/import \{ base44 \} from '@\/api\/base44Client';/g, "import { supabase } from '@/api/supabaseClient';");

    // list("-created_date", 100) -> order/limit
    content = content.replace(/base44\.entities\.(\w+)\.list\("([^"]+)",\s*(\d+)\)/g, (match, entity, order, limit) => {
        const table = toSnakeCase(entity);
        const isDesc = order.startsWith('-');
        const orderField = isDesc ? order.substring(1) : order;
        return `supabase.from('${table}').select('*').order('${orderField}', { ascending: ${!isDesc} }).limit(${limit}).then(res => res.data)`;
    });

    // list("nombre", 200) -> order/limit
    content = content.replace(/base44\.entities\.(\w+)\.list\("([^"]+)",\s*(\d+)\)/g, (match, entity, order, limit) => {
        const table = toSnakeCase(entity);
        const isDesc = order.startsWith('-');
        const orderField = isDesc ? order.substring(1) : order;
        return `supabase.from('${table}').select('*').order('${orderField}', { ascending: ${!isDesc} }).limit(${limit}).then(res => res.data)`;
    });

    // list()
    content = content.replace(/base44\.entities\.(\w+)\.list\(\)/g, (match, entity) => {
        return `supabase.from('${toSnakeCase(entity)}').select('*').then(res => res.data)`;
    });

    // filter({id}, "-created_date", 100)
    content = content.replace(/base44\.entities\.(\w+)\.filter\(([^,]+),\s*"([^"]+)",\s*(\d+)\)/g, (match, entity, filterObj, order, limit) => {
        const table = toSnakeCase(entity);
        const isDesc = order.startsWith('-');
        const orderField = isDesc ? order.substring(1) : order;
        return `supabase.from('${table}').select('*').match(${filterObj}).order('${orderField}', { ascending: ${!isDesc} }).limit(${limit}).then(res => res.data)`;
    });

    // filter({id})
    content = content.replace(/base44\.entities\.(\w+)\.filter\(([^)]+)\)/g, (match, entity, filterObj) => {
        return `supabase.from('${toSnakeCase(entity)}').select('*').match(${filterObj}).then(res => res.data)`;
    });

    // create(data)
    content = content.replace(/base44\.entities\.(\w+)\.create\(([^)]+)\)/g, (match, entity, data) => {
        return `supabase.from('${toSnakeCase(entity)}').insert(${data}).select().then(res => res.data[0])`;
    });

    // update(id, data)
    content = content.replace(/base44\.entities\.(\w+)\.update\(([^,]+),\s*([^)]+)\)/g, (match, entity, id, data) => {
        return `supabase.from('${toSnakeCase(entity)}').update(${data}).eq('id', ${id}).select().then(res => res.data[0])`;
    });

    // delete(id)
    content = content.replace(/base44\.entities\.(\w+)\.delete\(([^)]+)\)/g, (match, entity, id) => {
        return `supabase.from('${toSnakeCase(entity)}').delete().eq('id', ${id})`;
    });

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
    }
});
