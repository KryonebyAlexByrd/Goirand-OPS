import { generateReportWithFallback } from './utils/ai.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Falta el prompt' });
  }

  const promptInstructions = `
Actúa como un ingeniero administrador de obra y supervisor profesional de Goirand OPS.
Genera un reporte de observaciones estructurado en MARKDOWN PURO. 
DEBES usar TABLAS (\`| Columna 1 | Columna 2 |\`) para mostrar los avances.
DEBES usar resaltado en negrita y viñetas para problemas y recomendaciones.
NO saludes, NO incluyas introducciones genéricas ni despidas el mensaje. Ve directo a los datos duros, con la siguiente estructura estricta:

# Reporte de Estado - Goirand OPS

## 📊 Avance General
(Menciona el avance global y los proyectos activos)

## 🏗️ Desglose por Proyecto
(Crea una TABLA en Markdown detallada para CADA proyecto, con las columnas: Producto, Meta, Realizado, Restante)

## ⚠️ Alertas y Riesgos
(Usa viñetas para listar problemas, retrasos o riesgos críticos)

## 🎯 Recomendaciones
(Lista de acciones a tomar)

Aquí está la data cruda:
${prompt}
  `;

  try {
    const reportText = await generateReportWithFallback(promptInstructions);
    res.json({ report: reportText });
  } catch (error) {
    console.error('Error generando observaciones:', error);
    res.status(500).json({ error: error.message });
  }
}
