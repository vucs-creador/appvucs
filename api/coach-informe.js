// Cron 7:00am (hora Colombia) -- busca el ultimo cierre guardado que aun
// no se ha enviado, lo manda por WhatsApp con CallMeBot, y lo marca como
// enviado para no repetirlo si el cron corre dos veces por cualquier motivo.

const SB_URL = 'https://jcddfjsetmgdlafjabdq.supabase.co';
const SUPA_HEADERS = {
  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZGRmanNldG1nZGxhZmphYmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTQ2MTksImV4cCI6MjA5NjA5MDYxOX0.NytxezqoeuHKB_6zZM-xO2Tqk3_OqzP0IdYBk7Z2FLE',
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZGRmanNldG1nZGxhZmphYmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTQ2MTksImV4cCI6MjA5NjA5MDYxOX0.NytxezqoeuHKB_6zZM-xO2Tqk3_OqzP0IdYBk7Z2FLE',
  'Content-Type': 'application/json'
};

const WHATSAPP_PHONE = '573127235730';
const CALLMEBOT_APIKEY = '3998042';

async function enviarWhatsapp(texto){
  const url = 'https://api.callmebot.com/whatsapp.php?phone='+encodeURIComponent(WHATSAPP_PHONE)
    +'&text='+encodeURIComponent(texto)+'&apikey='+encodeURIComponent(CALLMEBOT_APIKEY);
  const r = await fetch(url);
  const body = await r.text();
  if(!r.ok || /error/i.test(body)) throw new Error('CallMeBot no pudo enviar el mensaje: '+body.slice(0,200));
  return body;
}

export default async function handler(req,res){
  try{
    if(WHATSAPP_PHONE.startsWith('PENDIENTE') || CALLMEBOT_APIKEY.startsWith('PENDIENTE')){
      return res.status(400).json({ok:false,error:'Falta configurar WHATSAPP_PHONE y CALLMEBOT_APIKEY en api/coach-informe.js'});
    }

    // No se filtra por 'fecha de hoy': este cron corre la MAÑANA
    // SIGUIENTE al cierre, asi que la fecha guardada siempre es 'ayer'.
    // Se toma directo el ultimo cierre sin enviar, sea cual sea su fecha.
    const q='enviado=eq.false&order=created_at.desc&limit=1';
    const r=await fetch(SB_URL+'/rest/v1/coach_reportes?'+q,{headers:SUPA_HEADERS});
    if(!r.ok) throw new Error('No se pudo leer coach_reportes ('+r.status+')');
    const rows=await r.json();

    if(!rows.length){
      return res.status(200).json({ok:true,enviado:false,motivo:'No hay cierre pendiente para hoy todavia.'});
    }

    const reporte=rows[0];
    const encabezado='*Gerónimo · Informe de ayer*\\n'+reporte.mes.toUpperCase()+' · '+reporte.fecha+'\\n\\n';
    await enviarWhatsapp(encabezado+reporte.informe);

    await fetch(SB_URL+'/rest/v1/coach_reportes?id=eq.'+reporte.id,{method:'PATCH',headers:SUPA_HEADERS,body:JSON.stringify({enviado:true})});

    return res.status(200).json({ok:true,enviado:true,fecha:reporte.fecha});
  }catch(e){
    console.error('coach-informe error',e);
    return res.status(500).json({ok:false,error:e.message||'Error enviando el informe'});
  }
}
