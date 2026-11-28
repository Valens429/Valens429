(function(){
  'use strict';
  var KEY='ls.lang', lang='es', D=(window.SITE_I18N&&window.SITE_I18N.en)||{};
  try{
    var q=new URLSearchParams(location.search).get('lang'), s=localStorage.getItem(KEY);
    lang=q||s||'en';
  }catch(e){}
  if(lang!=='es') lang='en';
  window.SITE_LANG=lang;
  window.__t=function(k,es){ return (lang==='en'&&D[k]!=null)?D[k]:es; };
  var de=document.documentElement;
  function apply(){
    if(lang!=='en') return;
    var i,el,list=document.querySelectorAll('[data-ls]');
    for(i=0;i<list.length;i++){ el=list[i]; var v=D[el.getAttribute('data-ls')]; if(v==null) continue;
      if(el.tagName==='TITLE') document.title=v; else el.innerHTML=v; }
    list=document.querySelectorAll('[data-lsa]');
    for(i=0;i<list.length;i++){ (function(el){ el.getAttribute('data-lsa').split(';').forEach(function(p){ var a=p.split(':'); var v=D[a[1]]; if(a[0]&&v!=null) el.setAttribute(a[0],v); }); })(list[i]); }
    de.lang='en';
    var loc=document.querySelector('meta[property="og:locale"]'); if(loc) loc.setAttribute('content','en_US');
  }
  apply();
  function button(){
    var en=lang==='en', b=document.createElement('button');
    b.type='button'; b.className='lang-btn'; b.id='langBtn';
    b.textContent=en?'ES':'EN'; b.title=en?'Cambiar a español':'Switch to English'; b.setAttribute('aria-label',b.title);
    b.addEventListener('click',function(){
      try{ localStorage.setItem(KEY,en?'es':'en'); }catch(e){}
      var u=new URL(location.href), had=u.searchParams.has('lang'); u.searchParams.delete('lang'); if(had) location.replace(u.toString()); else location.reload();
    });
    var slot=document.getElementById('langSlot'); if(slot) slot.appendChild(b); else { b.className+=' lang-fixed'; document.body.appendChild(b); }
    var st=document.createElement('style');
    st.textContent='.lang-btn{font:600 .78rem/1 inherit;letter-spacing:.06em;color:inherit;background:transparent;border:1px solid currentColor;border-radius:999px;padding:8px 12px;cursor:pointer;opacity:.78;transition:opacity .15s}.lang-btn:hover,.lang-btn:focus-visible{opacity:1}.lang-fixed{position:fixed;top:14px;right:14px;z-index:60;background:rgba(0,0,0,.35);color:#fff;border-color:rgba(255,255,255,.5)}#langSlot{display:inline-flex;align-items:center;margin-left:10px}';
    document.head.appendChild(st);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',button); else button();
  de.style.visibility='';
})();