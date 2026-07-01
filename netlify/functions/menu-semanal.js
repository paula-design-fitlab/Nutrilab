// netlify/functions/menu-semanal.js
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

  const { dias, recetas } = payload

  if (!dias || dias.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No hay días con horario asignado' }) }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Falta ANTHROPIC_API_KEY en variables de entorno de Netlify' }) }
  }

  const prompt = `Eres el planificador de menús de NutriLab. Genera un menú semanal equilibrado.

Días y comidas a planificar:
${JSON.stringify(dias, null, 2)}

Recetario disponible:
${JSON.stringify(recetas, null, 2)}

Responde SOLO con JSON válido, sin texto ni bloques markdown:

{
  "notas": "Breve descripción del menú",
  "menu": [
    {
      "fecha": "2026-06-29",
      "tipo_comida": "comida",
      "receta_id": 5,
      "nombre": "Nombre de la receta"
    }
  ]
}

Reglas:
- Asigna exactamente una receta por cada combinación fecha+tipo_comida de "dias".
- Usa solo recetas cuya categoria coincida: desayuno→desayuno, comida→comida o cocina de siempre, merienda→merienda, cena→cena.
- No repitas la misma receta más de 2 veces.
- Equilibra calorías entre días.
- Varía las proteínas (no pollo todos los días).`

  const body = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
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
            resolve({ statusCode: 500, body: JSON.stringify({ error: 'Error parseando respuesta', detail: e.message, raw: data.slice(0, 200) }) })
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
