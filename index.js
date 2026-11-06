import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
const allowed=req=>{const a=process.env.BRIDGE_API_TOKEN||'',b=req.headers['x-bridge-token']||'';return !!a&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b))};
createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(req.method==='GET'&&path==='/api/health')return json(res,200,{service:'manus-openai-bridge',status:'online',version:'1.0.1'});
 if(path==='/api/verify'){
  if(!allowed(req))return json(res,401,{error:'unauthorized'});
  if(req.method!=='GET')return json(res,405,{error:'method_not_allowed'});
  const checks={};
  for(const [name,url,headers] of [['manus','https://api.manus.ai/v2/user.me',{'x-manus-api-key':process.env.MANUS_API_KEY||''}],['openai','https://api.openai.com/v1/models',{Authorization:'Bearer '+(process.env.OPENAI_API_KEY||'')}]]){
   try{const r=await fetch(url,{headers,signal:AbortSignal.timeout(8000)});checks[name]={connected:r.ok,httpStatus:r.status}}catch{checks[name]={connected:false,error:'request_failed'}}
  }
  return json(res,200,{checks});
 }
 return json(res,404,{error:'not_found'});
}).listen(process.env.PORT||3000,'0.0.0.0');
