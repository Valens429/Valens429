'use strict';
const D={
  en:{
    'editor.missing':'Could not find the editor.\nCopy the contents of your "editor" folder into:\n',
    'ff.not_found':'FFmpeg not found.',
    'ff.bad_dest':'Invalid save destination.',
    'ff.no_encoder':'Encoder not available on this computer.',
    'ff.stopped':'FFmpeg stopped: {detail}',
    'ff.no_detail':'no details',
    'ff.unknown_job':'Unknown job.',
    'ff.failed':'FFmpeg finished with an error.',
    'pj.bad_id':'Invalid project id.',
    'pj.bad_media':'Invalid media type.',
    'pj.bad_project':'Invalid project.',
    'pj.no_write':'No write session is open.',
    'pj.chunk_too_big':'Chunk too large.',
    'pj.bad_origin':'Origin not allowed.',
    'srv.not_found':'Not found',
    'cb.connecting':'Connecting to Lyric Studio…',
    'cb.no_data':'No session data',
    'cb.no_data_msg':'Go back to Lyric Studio and sign in again.',
    'cb.signin_failed':'Could not sign in',
    'cb.ready':'All set!',
    'cb.fail_msg':'Go back to Lyric Studio to see the details.',
    'cb.ok_msg':'You can now close this tab and return to Lyric Studio.',
    'cb.expired':'Link expired or already used',
    'cb.expired_msg':'Go back to Lyric Studio and request access again.',
    'cb.app_closed':'Lyric Studio is not open',
    'cb.app_closed_msg':'Open the desktop app and request access again.'
  },
  es:{
    'editor.missing':'No encuentro el editor.\nCopia el contenido de tu carpeta "editor" dentro de:\n',
    'ff.not_found':'No encuentro FFmpeg.',
    'ff.bad_dest':'Destino de guardado no válido.',
    'ff.no_encoder':'Encoder no disponible en este equipo.',
    'ff.stopped':'FFmpeg se detuvo: {detail}',
    'ff.no_detail':'sin detalle',
    'ff.unknown_job':'Trabajo desconocido.',
    'ff.failed':'FFmpeg terminó con error.',
    'pj.bad_id':'Id de proyecto no válido.',
    'pj.bad_media':'Medio no válido.',
    'pj.bad_project':'Proyecto no válido.',
    'pj.no_write':'No hay escritura abierta.',
    'pj.chunk_too_big':'Trozo demasiado grande.',
    'pj.bad_origin':'Origen no permitido.',
    'srv.not_found':'No encontrado',
    'cb.connecting':'Conectando con Lyric Studio…',
    'cb.no_data':'No hay datos de sesión',
    'cb.no_data_msg':'Vuelve a Lyric Studio e inicia sesión de nuevo.',
    'cb.signin_failed':'No se pudo iniciar sesión',
    'cb.ready':'¡Listo!',
    'cb.fail_msg':'Vuelve a Lyric Studio para ver el detalle.',
    'cb.ok_msg':'Ya puedes cerrar esta pestaña y volver a Lyric Studio.',
    'cb.expired':'Enlace caducado o ya usado',
    'cb.expired_msg':'Vuelve a Lyric Studio y pide el acceso otra vez.',
    'cb.app_closed':'Lyric Studio no está abierto',
    'cb.app_closed_msg':'Abre la app de escritorio y pide el acceso otra vez.'
  }
};
let lang='en';
const setLang=c=>{ lang=D[c]?c:'en'; };
const getLang=()=>lang;
const t=(k,p)=>{ const s=(D[lang]&&D[lang][k])||D.en[k]||k; return p?s.replace(/\{(\w+)\}/g,(m,n)=>p[n]!==undefined?String(p[n]):m):s; };
module.exports={t,setLang,getLang,languages:Object.keys(D),D};