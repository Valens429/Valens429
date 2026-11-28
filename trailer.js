(function(){
  'use strict';
  var sec=document.getElementById('trailer');
  if(!sec) return;

  // Acepta un link de YouTube (watch, youtu.be, shorts, embed) o el ID de 11 caracteres.
  var raw=(sec.getAttribute('data-yt')||'').trim();
  var m=raw.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/)||raw.match(/^([A-Za-z0-9_-]{11})$/);
  if(!m) return; // sin video configurado, la sección queda oculta
  var id=m[1];

  var en=window.SITE_LANG==='en';
  var TXT=en?{
    eyebrow:'Trailer',
    title:'Watch the trailer',
    lead:'A quick look at Lyric Studio. Launching December 1, 2026.',
    note:'This is the first app I\u2019ve ever built and I\u2019m so excited to share it. Thank you for watching. All feedback is welcome!',
    play:'Play the trailer',
    frame:'Lyric Studio trailer'
  }:{
    eyebrow:'Trailer',
    title:'Mira el trailer',
    lead:'Un vistazo r\u00e1pido a Lyric Studio. Lanzamiento el 1 de diciembre de 2026.',
    note:'Es la primera app que creo y me emociona mucho compartirla. Gracias por mirar. \u00a1Todo feedback es bienvenido!',
    play:'Reproducir el trailer',
    frame:'Trailer de Lyric Studio'
  };

  function set(i,t){var el=document.getElementById(i);if(el)el.textContent=t;}
  set('trEyebrow',TXT.eyebrow);set('trTitle',TXT.title);set('trLead',TXT.lead);set('trNote',TXT.note);

  var box=document.getElementById('trPlayer');
  if(!box) return;

  var btn=document.createElement('button');
  btn.type='button';btn.className='tr-poster';btn.setAttribute('aria-label',TXT.play);

  var img=document.createElement('img');
  img.alt='';img.loading='lazy';img.decoding='async';
  img.src='https://i.ytimg.com/vi/'+id+'/maxresdefault.jpg';
  // Si no existe la versi\u00f3n HD, YouTube devuelve una imagen diminuta: usamos la normal.
  img.addEventListener('load',function(){
    if(img.naturalWidth<=120&&img.dataset.fb!=='1'){img.dataset.fb='1';img.src='https://i.ytimg.com/vi/'+id+'/hqdefault.jpg';}
  });
  img.addEventListener('error',function(){
    if(img.dataset.fb!=='1'){img.dataset.fb='1';img.src='https://i.ytimg.com/vi/'+id+'/hqdefault.jpg';}
  });

  var play=document.createElement('span');
  play.className='tr-play';play.setAttribute('aria-hidden','true');
  play.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.53.85l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5z"/></svg>';

  btn.appendChild(img);btn.appendChild(play);
  box.appendChild(btn);

  // El iframe se crea solo al hacer clic: la p\u00e1gina no carga YouTube hasta que alguien reproduce.
  btn.addEventListener('click',function(){
    var f=document.createElement('iframe');
    f.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0&playsinline=1&hl='+(en?'en':'es');
    f.title=TXT.frame;
    f.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.setAttribute('allowfullscreen','');
    f.referrerPolicy='strict-origin-when-cross-origin';
    box.replaceChildren(f);
  });

  sec.hidden=false;
})();
