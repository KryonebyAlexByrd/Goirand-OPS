export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { base64, mimeType } = req.body;
  if (!base64 || !mimeType) return res.status(400).json({ error: 'Falta base64 o mimeType' });

  const prompt = `Extrae las partidas de cotización de este documento. Devuelve ÚNICAMENTE un JSON puro con la estructura: { "partidas": [ { "codigo": "Opcional", "tipo_trabajo": "Descripción principal", "descripcion": "Detalles adicionales", "cantidad_total": 10, "unidad": "pz", "precio_unitario": 100, "precio_total": 1000 } ] }. No incluyas markdown ni ningún otro texto.`;

  try {
    const apiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY}`,
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
    
    if (!apiRes.ok) throw new Error(await apiRes.text());
    
    const data = await apiRes.json();
    let text = data.choices[0].message.content;
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    res.json({ result: JSON.parse(text) });
  } catch (error) {
    console.error("AI Cotizacion Error:", error);
    res.status(500).json({ error: error.message });
  }
}
