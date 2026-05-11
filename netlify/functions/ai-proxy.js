// Netlify Function: AI Proxy — menggunakan GROQ API (GRATIS)
// Groq: https://console.groq.com — daftar gratis, tidak perlu kartu kredit

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: 'GROQ_API_KEY belum diset di Netlify Environment Variables. Daftar gratis di console.groq.com' } }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    const groqMessages = [];

    if (body.system) {
      groqMessages.push({ role: 'system', content: body.system });
    }

    for (const msg of (body.messages || [])) {
      let textContent = '';
      if (typeof msg.content === 'string') {
        textContent = msg.content;
      } else if (Array.isArray(msg.content)) {
        const hasImage = msg.content.some(b => b.type === 'image');
        textContent = msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
        if (hasImage) textContent = '[Chart image diupload — analisa berdasarkan konteks pair/timeframe]\n' + textContent;
      }
      if (textContent.trim()) groqMessages.push({ role: msg.role, content: textContent });
    }

    const groqBody = {
      model:       'llama-3.3-70b-versatile',
      max_tokens:  body.max_tokens || 1000,
      temperature: 0.7,
      messages:    groqMessages,
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body:    JSON.stringify(groqBody),
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: { message: data?.error?.message || 'Groq API error' } }),
      };
    }

    const groqText = data?.choices?.[0]?.message?.content || '';
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: [{ type: 'text', text: groqText }] }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: err.message } }),
    };
  }
};
