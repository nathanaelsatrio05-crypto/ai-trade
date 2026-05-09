const H={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST,OPTIONS'};
exports.handler=async(e)=>{
  if(e.httpMethod==='OPTIONS')return{statusCode:200,headers:H,body:''};
  if(e.httpMethod!=='POST')return{statusCode:405,body:'Method Not Allowed'};
  const k=process.env.GROQ_API_KEY;
  if(!k)return{statusCode:500,headers:{...H,'Content-Type':'application/json'},body:JSON.stringify({error:{message:'GROQ_API_KEY belum diset'}})};
  try{
    const b=JSON.parse(e.body),msgs=[];
    if(b.system)msgs.push({role:'system',content:b.system});
    for(const m of(b.messages||[])){
      let t=typeof m.content==='string'?m.content:(m.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('\n');
      if(Array.isArray(m.content)&&m.content.some(x=>x.type==='image'))t='[Chart diupload]\n'+t;
      if(t.trim())msgs.push({role:m.role,content:t});
    }
    const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+k},body:JSON.stringify({model:'llama-3.3-70b-versatile',max_tokens:b.max_tokens||1000,temperature:0.7,messages:msgs})});
    const d=await r.json();
    if(!r.ok)return{statusCode:r.status,headers:{...H,'Content-Type':'application/json'},body:JSON.stringify({error:{message:d?.error?.message||'Groq error'}})};
    return{statusCode:200,headers:{...H,'Content-Type':'application/json'},body:JSON.stringify({content:[{type:'text',text:d?.choices?.[0]?.message?.content||''}]})};
  }catch(err){
    return{statusCode:500,headers:{...H,'Content-Type':'application/json'},body:JSON.stringify({error:{message:err.message}})};
  }
};
