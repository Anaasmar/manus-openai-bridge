export default function handler(req,res){res.setHeader('Cache-Control','no-store');res.status(200).json({service:'manus-openai-bridge',status:'online',version:'1.0.0'});}
