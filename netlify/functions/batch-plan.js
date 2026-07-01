// netlify/functions/batch-plan.js
// Genera el plan de Batch Ingredientes usando Claude a partir del menú semanal

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

  const { recetas_semana, dia_batch } = payload
  // recetas_semana: array de objetos { tipo_comida, nombre, ingredientes, batch_ingredientes }

  const prompt = `Eres el asistente de nutrición de NutriLab. Tu tarea es generar el plan de Batch Ingredientes para esta semana.

El menú semanal incluye estas recetas:
${JSON.stringify(recetas_semana, null, 2)}

El día elegido para cocinar es: ${dia_batch || 'domingo'}

Analiza los ingredientes de estas recetas y genera un plan de Batch Ingredientes. Responde SOLO con un JSON válido, sin texto adicional, sin bloques de código markdown, con esta estructura exacta:

{
  "notas": "Breve descripción del plan (1-2 frases)",
  "items": [
    {
      "nombre": "nombre del ingrediente batch (ej: Pollo cocinado)",
      "categoria": "proteina | hidrato | verdura | salsa_base",
      "cantidad_preparar": 500,
      "unidad": "g | unidades | bote | porción",
      "recetas_asociadas": ["nombre receta 1", "nombre receta 2"],
      "duracion_nevera_dias": 3,
      "congelable": true,
      "metodo_preparacion": "Cómo prepararlo en 1 frase",
      "orden_preparacion": 1,
      "momento": "domingo | mitad_semana",
      "observaciones": "consejo útil o null"
    }
  ]
}

Reglas:
- Solo incluye ingredientes que realmente aparecen en las recetas del menú y que tengan sentido preparar con antelación (pollo, arroz, patatas, huevos, verduras, salsas base...).
- Calcula cantidades sumando las que aparecen en las recetas, añadiendo un 10-15% extra si el ingrediente se usa en 3 o más recetas.
- Ordena los items por orden_preparacion (1 primero) de más a menos tiempo de cocción.
- Pon en momento "mitad_semana" solo si el ingrediente dura menos de 4 días en nevera o es una ensalada/vegetal fresco.
- El total de tiempo de preparación no debe superar 2 horas.
- Máximo 8 items en total.`

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
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const texto = data.content?.[0]?.text || ''

    // Limpiar posibles bloques markdown y parsear
    const limpio = texto.replace(/```json|```/g, '').trim()
    const plan = JSON.parse(limpio)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    }
  } catch (err) {
    console.error('Error generando batch plan:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error generando el plan', detail: err.message }),
    }
  }
}
