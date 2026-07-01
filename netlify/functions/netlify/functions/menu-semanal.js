// netlify/functions/menu-semanal.js
// Genera el menú semanal completo usando Claude

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  let payload
  try {
    payload = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' }
  }

  const { dias, recetas } = payload
  // dias: [{ fecha, tipo_comida: ['comida','cena',...] }]
  // recetas: [{ id, nombre, categoria, subcategoria, calorias, proteina, hidratos, grasas, etiquetas, taper, batch_ingredientes }]

  const prompt = `Eres el planificador de menús de NutriLab. Tu tarea es generar un menú semanal equilibrado.

Esta semana, los días y comidas a planificar son:
${JSON.stringify(dias, null, 2)}

El recetario disponible es:
${JSON.stringify(recetas, null, 2)}

Genera un menú semanal equilibrado. Responde SOLO con un JSON válido, sin texto adicional ni bloques markdown:

{
  "notas": "Breve descripción del menú (1-2 frases)",
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
- Asigna exactamente una receta por cada combinación fecha+tipo_comida que aparece en "dias".
- Usa solo recetas del recetario cuya categoria coincida con el tipo_comida (desayuno→desayuno, comida→comida o cocina de siempre, merienda→merienda, cena→cena).
- No repitas la misma receta más de 2 veces en la semana.
- Busca equilibrio calórico entre días (evita días extremos).
- Varía las proteínas (no pollo todos los días de comida).
- Para cenas, prioriza recetas de categoría "cena".
- Para comidas, alterna entre "comida" y "cocina de siempre".
- Devuelve exactamente el mismo número de items que combinaciones fecha+tipo_comida hay en "dias".`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const texto = data.content?.[0]?.text || ''
    const limpio = texto.replace(/```json|```/g, '').trim()
    const resultado = JSON.parse(limpio)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resultado),
    }
  } catch (err) {
    console.error('Error generando menú:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error generando el menú', detail: err.message }),
    }
  }
}
