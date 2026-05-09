const CORS = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST,OPTIONS'};
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return {statusCode:200,headers:CORS,body:''};
  if (event.httpMethod !== 'POST') return {statusCode:405,body:'Method Not Allowed'};
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return {statusCode:500,headers:{...CORS,'Content-Type':'application/json'},body:JSON.stringify({error:{message:'GROQ_API_KEY belum diset'}})};
  try {
    const body = JSON.parse(event.body);
    const msgs = [];
    if (body.system) msgs.push({role:'system',content:body.system});
    for (const m of (body.messages||[])) {
      let text = typeof m.content==='string' ? m.content : (m.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n');
      const hasImg = Array.isArray(m.content) && m.content.some(b=>b.type==='image');
      if (hasImg) text = '[Chart image diupload]\n'+text;
      if (text.trim()) msgs.push({role:m.role,content:text});
    }
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey},
      body:JSON.stringify({model:'llama3-70b-8192',max_tokens:body.max_tokens||1000,temperature:0.7,messages:msgs})
    });
    const data = await res.json();
    if (!res.ok) return {statusCode:res.status,headers:{...CORS,'Content-Type':'application/json'},body:JSON.stringify({error:{message:data?.error?.message||'Groq error'}})};
    const text = data?.choices?.[0]?.message?.content||'';
    return {statusCode:200,headers:{...CORS,'Content-Type':'application/json'},body:JSON.stringify({content:[{type:'text',text}]})};
  } catch(err) {
    return {statusCode:500,headers:{...CORS,'Content-Type':'application/json'},body:JSON.stringify({error:{message:err.message}})};
  }
};
