import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function AIAnalyst({ proyectos, onExecuteChanges, onExportExcel }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "¡Hola! Soy el Copiloto de Operaciones de Goirand. Puedo analizar cargas de trabajo, identificar cuellos de botella y ejecutar reasignaciones masivas. ¿En qué te ayudo hoy?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Prepare table state for context
    const tableState = proyectos.map(p => ({
      proyecto: p.descripcion,
      id: p.id,
      articulos: (Array.isArray(p.partidas_cotizacion) ? p.partidas_cotizacion : []).map(part => ({
        clave: part.codigo,
        descripcion: part.tipo_trabajo,
        contratista: part.contratista,
        pedido: part.cantidad_total,
        realizado: part.cantidad_realizada
      }))
    }));

    const systemPrompt = `
Eres el Director de Operaciones con Inteligencia Artificial de Goirand, una fábrica de muebles de alta gama y hotelería.

**Tu Contexto:**
1. Las Cotizaciones son los presupuestos aprobados por los clientes con listas de muebles.
2. Las O.A. (Órdenes de Asignación) son documentos internos donde se decide qué contratista va a fabricar qué mueble.
3. Los Contratistas (ej. Erik, Alam, Briones) son los líderes de cuadrilla. Pueden ser múltiples por mueble.

**Tu Misión:**
Llevar un orden impecable del seguimiento de los contratistas. Tienes acceso a la base de datos de producción actual (ver al final de este prompt).

**Capacidades Especiales (Ejecución de Comandos):**
Si el usuario te pide REASIGNAR tareas o EXPORTAR la tabla, DEBES incluir un bloque de código JSON especial en tu respuesta. La aplicación leerá ese JSON y ejecutará la acción.
EL JSON DEBE ESTAR DENTRO DE UN BLOQUE DE CÓDIGO MARCADO CON \`\`\`json y \`\`\`.

Formato para REASIGNAR:
\`\`\`json
{
  "action": "reassign",
  "changes": [
    { "proyecto_id": "...", "codigo": "HAB-200", "tipo_trabajo": "...", "nuevo_contratista": "ALAM / ERIK" }
  ]
}
\`\`\`
Nota: Puedes incluir múltiples cambios en el array 'changes'.

Formato para EXPORTAR:
\`\`\`json
{
  "action": "export",
  "filename": "Reporte_Sugerido"
}
\`\`\`

**Reglas de Conducta:**
- Analiza cuellos de botella (quién tiene más piezas asignadas con 0 progreso).
- Habla como un ingeniero industrial experto, al grano, profesional.
- NUNCA inventes IDs o códigos que no estén en el estado de la tabla actual.
- Usa lenguaje natural para explicar qué harás, seguido del bloque JSON si vas a ejecutar algo.

**Estado Actual de la Fábrica (JSON):**
${JSON.stringify(tableState)}
    `;

    try {
      const groqKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!groqKey) throw new Error("No VITE_GROQ_API_KEY found");

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.filter(m => m.role !== 'system'),
            userMessage
          ],
          temperature: 0.2,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        throw new Error("Failed to fetch from Groq");
      }

      const data = await response.json();
      let assistantContent = data.choices[0].message.content;

      // Extract JSON commands
      const jsonRegex = /```json\n([\s\S]*?)\n```/g;
      let match;
      let actionExecuted = false;

      while ((match = jsonRegex.exec(assistantContent)) !== null) {
        try {
          const command = JSON.parse(match[1]);
          if (command.action === "reassign" && command.changes) {
            onExecuteChanges(command.changes);
            actionExecuted = true;
          } else if (command.action === "export") {
            onExportExcel(command.filename || "Reporte_IA");
            actionExecuted = true;
          }
        } catch (e) {
          console.error("Error parsing AI command:", e);
        }
      }

      // Remove the JSON block from the text shown to the user to keep it clean
      const textToDisplay = assistantContent.replace(/```json\n([\s\S]*?)\n```/g, '').trim();

      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: textToDisplay + (actionExecuted ? "\n\n*(He ejecutado los comandos solicitados exitosamente)*" : "")
      }]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Ocurrió un error al contactar al motor de IA. Por favor intenta de nuevo o verifica tu conexión." 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <Card className="bg-[#0a192f] border-[#233554] shadow-2xl mt-8">
      <CardHeader className="border-b border-[#233554]/50 bg-[#112240] py-3">
        <CardTitle className="text-sm font-semibold flex items-center text-orange-400">
          <Sparkles className="w-4 h-4 mr-2" /> Copiloto de Operaciones (IA)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col h-[400px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-orange-600" : "bg-[#233554]"}`}>
                  {msg.role === "user" ? <span className="text-xs font-bold text-white">TÚ</span> : <Bot className="w-4 h-4 text-blue-300" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl p-3 text-sm ${msg.role === "user" ? "bg-orange-600 text-white rounded-tr-none" : "bg-[#112240] text-slate-200 border border-[#233554] rounded-tl-none"}`}>
                  <ReactMarkdown className="prose prose-invert prose-sm max-w-none">
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3 flex-row">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#233554]">
                  <Bot className="w-4 h-4 text-blue-300" />
                </div>
                <div className="max-w-[80%] rounded-2xl p-3 text-sm bg-[#112240] text-slate-200 border border-[#233554] rounded-tl-none flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                  <span className="ml-2 text-slate-400">Analizando datos de fábrica...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 bg-[#112240] border-t border-[#233554]">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Pide un análisis de cargas o reasigna un proyecto..."
                className="bg-[#0a192f] border-[#233554] text-white focus-visible:ring-orange-500 rounded-xl"
                disabled={isTyping}
              />
              <Button 
                onClick={handleSend} 
                disabled={isTyping || !input.trim()}
                className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center mt-2 text-[10px] text-slate-500">
              <AlertCircle className="w-3 h-3 mr-1" />
              La IA tiene permiso para modificar asignaciones en la base de datos si se lo pides.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
