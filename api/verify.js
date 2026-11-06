import { timingSafeEqual } from 'node:crypto';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const expected=process.env.BRIDGE_API_TOKEN||'', supplied=req.headers['x-bridge-token']||'';
 if(!expected||typeof supplied!=='string'||Buffer.byteLength(expected)!==Buffer.byteLength(supplied)||!timingSafeEqual(Buffer.from(expected),Buffer.from(supplied)))return res.status(401).json({error:'unauthorized'});
 if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});
 const checks={};
 for(const [name,url,headers] of [['manus','https://api.manus.ai/v2/user.me',{'x-manus-api-key':process.env.MANUS_API_KEY||''}],['openai','https://api.openai.com/v1/models',{Authorization:'Bearer '+(process.env.OPENAI_API_KEY||'')}]]){
  try{const r=await fetch(url,{headers,signal:AbortSignal.timeout(8000)});checks[name]={connected:r.ok,httpStatus:r.status};}
  catch{checks[name]={connected:false,error:'request_failed'};}
 }
 res.status(200).json({checks});
}
