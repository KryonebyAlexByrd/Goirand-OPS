export const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

/**
 * Genera el reporte de observaciones en base a registros
 */
export async function generateReporteObservaciones(periodo, registros) {
  const prompt = `Genera un reporte de observaciones estructurado, breve y profesional en español para el periodo: ${periodo}.
Resume las siguientes actividades:
${registros}

El reporte debe estar redactado para entregar a un cliente final de obra. No uses saludos informales.`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-1.5-flash",
        messages: [
          { role: "system", content: "Eres un ingeniero administrador de obra y supervisor profesional." },
          { role: "user", content: prompt }
        ]
      })
    });
    
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("AI Error:", error);
    return "Ocurrió un error al generar el reporte automático. Por favor, intenta redactarlo manualmente.";
  }
}

/**
 * Convierte un File a Base64 sin romper la pila
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });
}

/**
 * Parsea un PDF, CSV o XLSX para extraer partidas usando Gemini Multimodal
 */
export async function parseCotizacion(file) {
  const base64 = await fileToBase64(file);
  let mimeType = file.type;
  
  // Gemini expects exact mime types
  if (!mimeType) {
    if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
    else if (file.name.endsWith('.xlsx')) mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (file.name.endsWith('.csv')) mimeType = 'text/csv';
    else mimeType = 'application/octet-stream';
  }

  const prompt = `Extrae las partidas de cotización de este documento. Devuelve ÚNICAMENTE un JSON puro con la estructura: { "partidas": [ { "codigo": "Opcional", "tipo_trabajo": "Descripción principal", "descripcion": "Detalles adicionales", "cantidad_total": 10, "unidad": "pz", "precio_unitario": 100, "precio_total": 1000 } ] }. No incluyas markdown \`\`\`json ni ningún otro texto al inicio ni al final, solo el objeto JSON validable.`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-1.5-pro",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } }
            ]
          }
        ]
      })
    });
    
    if (!res.ok) {
      const e = await res.text();
      console.error(e);
      throw new Error("API error");
    }
    
    const data = await res.json();
    let text = data.choices[0].message.content;
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Cotizacion Error:", error);
    throw new Error("No se pudo extraer la cotización usando IA. Asegúrate de que el documento sea legible.");
  }
}
