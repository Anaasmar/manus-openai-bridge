import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))};
const allowed=req=>{const a=process.env.BRIDGE_API_TOKEN||'',b=req.headers['x-bridge-token']||'';return !!a&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b))};
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>12000)throw Error('payload_too_large')}try{return JSON.parse(text)}catch{throw Error('invalid_json')}}
async function upstream(url,options){const r=await fetch(url,{...options,signal:AbortSignal.timeout(25000)});let data;try{data=await r.json()}catch{data={}}return {ok:r.ok,status:r.status,data}}
const manusHeaders=()=>({'x-manus-api-key':process.env.MANUS_API_KEY||'','Content-Type':'application/json'});
createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/api/health'&&req.method==='GET')return json(res,200,{service:'manus-openai-bridge',status:'online',version:'1.1.0'});
 if(!allowed(req))return json(res,401,{error:'unauthorized'});
 try{
  if(path==='/api/verify'&&req.method==='GET'){
   const checks={};for(const [name,url,headers] of [['manus','https://api.manus.ai/v2/user.me',manusHeaders()],['openai','https://api.openai.com/v1/models',{Authorization:'Bearer '+(process.env.OPENAI_API_KEY||'')}]]){
    try{const r=await upstream(url,{headers});checks[name]={connected:r.ok,httpStatus:r.status}}catch{checks[name]={connected:false,error:'request_failed'}}
   }return json(res,200,{checks});
  }
  if(path==='/api/manus/task'&&req.method==='POST'){
   const input=await body(req);if(typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>8000)return json(res,400,{error:'invalid_prompt'});
   const r=await upstream('https://api.manus.ai/v2/task.create',{method:'POST',headers:manusHeaders(),body:JSON.stringify({message:{content:[{type:'text',text:input.prompt.trim(),visibility:'visible'}]},share_visibility:'private',agent_profile:'standard'})});
   return json(res,r.ok?200:502,r.ok?{ok:true,task_id:r.data.task_id,task_url:r.data.task_url}:{error:'manus_request_failed',upstream_status:r.status});
  }
  if(path==='/api/manus/status'&&req.method==='GET'){
   const id=new URL(req.url,'http://localhost').searchParams.get('task_id');
   if(!id||!/^[-_a-zA-Z0-9]{4,150}$/.test(id))return json(res,400,{error:'invalid_task_id'});
   const r=await upstream('https://api.manus.ai/v2/task.listMessages?task_id='+encodeURIComponent(id)+'&order=desc&limit=10',{headers:manusHeaders()});
   return json(res,r.ok?200:502,r.ok?{ok:true,result:r.data}:{error:'manus_request_failed',upstream_status:r.status});
  }
  if(path==='/api/openai/respond'&&req.method==='POST'){
   const input=await body(req);if(typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>8000)return json(res,400,{error:'invalid_prompt'});
   const r=await upstream('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+(process.env.OPENAI_API_KEY||''),'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-5.4-mini',input:input.prompt.trim(),max_output_tokens:500,store:false})});
   const output=r.data.output?.filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n')||'';
   return json(res,r.ok?200:502,r.ok?{ok:true,response_id:r.data.id,text:output}:{error:'openai_request_failed',upstream_status:r.status});
  }
  return json(res,404,{error:'not_found'});
 }catch(e){return json(res,e.message==='payload_too_large'?413:e.message==='invalid_json'?400:502,{error:['payload_too_large','invalid_json'].includes(e.message)?e.message:'upstream_unavailable'})}
}).listen(process.env.PORT||3000,'0.0.0.0');
