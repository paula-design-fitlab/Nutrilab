const https = require('https')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }

  let payload
  try { payload = JSON.parse(event.body) }
  catch (e) { return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido' }) } }

  const { dias, recetas, preferencias } = payload
  if (!dias || dias.length === 0) return { statusCode: 400, body: JSON.stringify({ error: 'No hay días con horario asignado' }) }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: 'Falta ANTHROPIC_API_KEY en Netlify' }) }

  const { tiempo = 'algo', diasGym = [], diasEspeciales = {}, sinBatch = false, contexto = '' } = preferencias || {}

  const tiempoDesc = {
    mucho: 'Tiene mucho tiempo para cocinar esta semana. Puede incluir recetas más elaboradas.',
    algo: 'Tiene algo de tiempo. Prioriza recetas sencillas y equilibradas.',
    poco: 'Va justa de tiempo. Usa solo recetas rápidas (menos de 20 minutos) y con táper.',
    minimo: 'Solo puede cocinar un día. Maximiza recetas con táper y batch ingredientes.',
  }[tiempo]

  const prompt = `Eres el planificador de menús de NutriLab. Genera un menú semanal para Paula.

═══════════════════════════════
CONTEXTO DE LA SEMANA (LEE ESTO PRIMERO Y RESPÉTALO AL PIE DE LA LETRA):
${contexto ? `"${contexto}"` : 'No hay contexto adicional esta semana.'}
═══════════════════════════════

RESTRICCIONES ADICIONALES:
- ${tiempoDesc}
${sinBatch ? '- IMPORTANTE: Esta semana NO puede hacer Batch Ingredientes. Elige solo recetas que no dependan de ingredientes preparados con antelación.' : '- Puede aprovechar Batch Ingredientes.'}
${diasGym.length > 0 ? `- Días de gimnasio (necesita más proteína estos días): ${diasGym.join(', ')}` : ''}
${Object.keys(diasEspeciales).length > 0 ? `- Días especiales (pon receta muy ligera o rápida): ${Object.keys(diasEspeciales).join(', ')}` : ''}

DÍAS Y COMIDAS A PLANIFICAR:
${JSON.stringify(dias, null, 2)}

RECETARIO DISPONIBLE:
${JSON.stringify(recetas, null, 2)}

Responde SOLO con JSON válido, sin texto ni bloques markdown:
{
  "notas": "Breve resumen del menú teniendo en cuenta el contexto de la semana",
  "menu": [
    { "fecha": "2026-06-29", "tipo_comida": "comida", "receta_id": 5, "nombre": "Nombre receta" }
  ]
}

REGLAS:
1. Asigna exactamente una receta por cada combinación fecha+tipo_comida de "dias".
2. Coincidencia de categoría: desayuno→desayuno, comida→comida o cocina de siempre, merienda→merienda, cena→cena.
3. No repitas la misma receta más de 2 veces en la semana.
4. Equilibra calorías entre días (no más de 400 kcal de diferencia).
5. Varía proteínas: no más de 2 días seguidos con la misma proteína principal.
6. Si el contexto menciona restricciones o preferencias concretas, son OBLIGATORIAS, no opcionales.`

  const body = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  })

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'x-api-key': apiKey,
        'anthropic-version': '2023-06-01', 'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (parsed.error) { resolve({ statusCode: 500, body: JSON.stringify({ error: parsed.error.message }) }); return }
          const texto = parsed.content?.[0]?.text || ''
          const limpio = texto.replace(/```json|```/g, '').trim()
          const resultado = JSON.parse(limpio)
          resolve({ statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resultado) })
        } catch (e) {
          resolve({ statusCode: 500, body: JSON.stringify({ error: 'Error parseando respuesta', detail: e.message }) })
        }
      })
    })
    req.on('error', (e) => resolve({ statusCode: 500, body: JSON.stringify({ error: 'Error de red', detail: e.message }) }))
    req.write(body)
    req.end()
  })
}
