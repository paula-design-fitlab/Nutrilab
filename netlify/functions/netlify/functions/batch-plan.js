// netlify/functions/batch-plan.js
const https = require('https')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  let payload
  try {
    payload = JSON.parse(event.body)
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido', detail: e.message }) }
  }

  const { recetas_semana, dia_batch } = payload

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Falta ANTHROPIC_API_KEY en variables de entorno de Netlify' }) }
  }

  const prompt = `Eres el asistente de nutrición de NutriLab. Genera el plan de Batch Ingredientes para esta semana.

Menú semanal:
${JSON.stringify(recetas_semana, null, 2)}

Día elegido para cocinar: ${dia_batch || 'domingo'}

Responde SOLO con JSON válido, sin texto ni bloques markdown:

{
  "notas": "Breve descripción del plan",
  "items": [
    {
      "nombre": "Pollo cocinado",
      "categoria": "proteina",
      "cantidad_preparar": 500,
      "unidad": "g",
      "recetas_asociadas": ["receta 1", "receta 2"],
      "duracion_nevera_dias": 3,
      "congelable": true,
      "metodo_preparacion": "Cómo prepararlo en 1 frase",
      "orden_preparacion": 1,
      "momento": "domingo",
      "observaciones": null
    }
  ]
}

Reglas:
- Solo ingredientes que aparecen en el menú y tienen sentido preparar con antelación.
- Calcula cantidades reales según las recetas.
- Ordena por tiempo de cocción (más largo primero).
- momento "mitad_semana" solo si dura menos de 4 días en nevera.
- Máximo 8 items, máximo 2 horas de preparación total.`

  const body = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) {
              resolve({ statusCode: 500, body: JSON.stringify({ error: 'Error de API Anthropic', detail: parsed.error.message }) })
              return
            }
            const texto = parsed.content?.[0]?.text || ''
            const limpio = texto.replace(/```json|```/g, '').trim()
            const resultado = JSON.parse(limpio)
            resolve({
              statusCode: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(resultado),
            })
          } catch (e) {
            resolve({ statusCode: 500, body: JSON.stringify({ error: 'Error parseando respuesta', detail: e.message }) })
          }
        })
      }
    )
    req.on('error', (e) => {
      resolve({ statusCode: 500, body: JSON.stringify({ error: 'Error de red', detail: e.message }) })
    })
    req.write(body)
    req.end()
  })
}
