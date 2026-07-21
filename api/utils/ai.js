export async function generateReportWithFallback(prompt) {
  const providers = [
    {
      name: 'Groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      key: process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY,
      model: 'llama3-8b-8192'
    },
    {
      name: 'OpenRouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      key: process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY,
      model: 'meta-llama/llama-3-8b-instruct:free'
    },
    {
      name: 'Cerebras',
      url: 'https://api.cerebras.ai/v1/chat/completions',
      key: process.env.CEREBRAS_API_KEY || process.env.VITE_CEREBRAS_API_KEY,
      model: 'llama3.1-8b'
    },
    {
      name: 'DeepSeek',
      url: 'https://api.deepseek.com/chat/completions',
      key: process.env.DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY,
      model: 'deepseek-chat'
    }
  ];

  let lastError = null;

  for (const provider of providers) {
    if (!provider.key) {
      console.log(`[AI] Saltando ${provider.name}, no hay API Key.`);
      continue;
    }

    try {
      console.log(`[AI] Intentando generar con ${provider.name}...`);
      const res = await fetch(provider.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3
        })
      });

      if (!res.ok) {
        throw new Error(`${provider.name} Error: ${res.statusText}`);
      }

      const data = await res.json();
      if (data && data.choices && data.choices[0] && data.choices[0].message) {
        console.log(`[AI] Éxito con ${provider.name}!`);
        return data.choices[0].message.content;
      } else {
        throw new Error(`${provider.name} devolvió un formato inválido.`);
      }
    } catch (err) {
      console.error(`[AI] Falló ${provider.name}: ${err.message}`);
      lastError = err;
    }
  }

  throw new Error(`Todos los proveedores de IA fallaron. Último error: ${lastError?.message}`);
}
