'use strict';
const {app,BrowserWindow,shell,dialog,Menu,ipcMain,screen,nativeTheme}=require('electron');
const path=require('path'),fs=require('fs');
const {startServer}=require('./server');
const ffmpeg=require('./electron-ffmpeg');
const desktopAuth=require('./desktop-auth-main');
const projects=require('./projects-main');
const mi18n=require('./main-i18n');
nativeTheme.themeSource='light'; // PayPal (popup de pago) se ve legible; el editor fija su propio tema oscuro por CSS
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

const EDITOR_DIR=path.resolve(process.env.LYRIC_EDITOR_DIR||path.join(__dirname,'editor'));
const PORT=47831;
let win=null, origin='';

const SITE_URL='https://lyricstudio.site/';
function siteTarget(u){
  try{
    const x=new URL(u);
    if(origin&&x.origin===origin){
      const p=x.pathname;
      if((/\.html?$/i.test(p)&&p!=='/index.html')||/^\/downloads(\/|$)/i.test(p)) return SITE_URL+p.replace(/^\//,'')+x.search+x.hash;
    }
  }catch(e){}
  return null;
}
const ICON=path.join(__dirname,'icon-512.png');

ipcMain.handle('feedback:capture',async()=>{
  try{
    if(!win||win.isDestroyed()) return null;
    const img=await win.webContents.capturePage();
    if(!img||img.isEmpty()) return null;
    const out=img.getSize().width>1600?img.resize({width:1600,quality:'good'}):img;
    return 'data:image/jpeg;base64,'+out.toJPEG(80).toString('base64');
  }catch(e){ return null; }
});

const WS_NAME='lyricstudio-workstation';
let wsTarget=null, wsWin=null;
function listDisplays(){
  const prim=screen.getPrimaryDisplay().id;
  return screen.getAllDisplays().map((d,i)=>({id:d.id,index:i,primary:d.id===prim,internal:!!d.internal,hz:Math.round(d.displayFrequency||0),label:d.label||'',scale:d.scaleFactor,bounds:d.bounds,workArea:d.workArea,
    width:Math.round(d.bounds.width*d.scaleFactor),height:Math.round(d.bounds.height*d.scaleFactor)}));
}
const displayById=id=>screen.getAllDisplays().find(d=>d.id===id)||null;
ipcMain.handle('screens:list',()=>listDisplays());
ipcMain.handle('ws:prepare',(e,t)=>{ wsTarget=(t&&typeof t==='object')?{mainId:+t.mainId,outputId:+t.outputId}:null; return true; });
ipcMain.handle('ws:toggleFullscreen',()=>{ if(!wsWin||wsWin.isDestroyed()) return false; wsWin.setFullScreen(!wsWin.isFullScreen()); return wsWin.isFullScreen(); });

// Cierra la ventana del WorkStation. Se usa al cerrar el proyecto / recargar el editor / cerrar la app,
// para que no quede una ventana huérfana mostrando un fotograma viejo en el segundo monitor.
function closeWs(){ const w=wsWin; wsWin=null; try{ if(w&&!w.isDestroyed()) w.close(); }catch(e){} }
ipcMain.handle('ws:close',()=>{ closeWs(); return true; });

// Identificar pantallas: superpone un número grande sobre cada monitor real durante unos segundos.
let idWins=[], idTimer=null;
function clearIdentify(){ clearTimeout(idTimer); idTimer=null; const l=idWins; idWins=[]; l.forEach(w=>{ try{ if(!w.isDestroyed()) w.destroy(); }catch(e){} }); }
const escHtml=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function identifyPage(num,sub){
  const css='html,body{margin:0;height:100%;overflow:hidden;background:rgba(9,7,12,.62);font-family:"Segoe UI",system-ui,sans-serif;color:#f6f1f7}body{display:grid;place-items:center}.b{text-align:center;padding:3vh 7vw;border:.7vh solid #e8b45f;border-radius:3vh;background:rgba(9,7,12,.9)}.n{font-size:34vh;font-weight:800;line-height:1;color:#e8b45f}.s{font-size:6vh;font-weight:600;margin-top:1vh;letter-spacing:.04em}';
  return 'data:text/html;charset=utf-8,'+encodeURIComponent('<!doctype html><meta charset="utf-8"><style>'+css+'</style><div class="b"><div class="n">'+escHtml(num)+'</div>'+(sub?'<div class="s">'+escHtml(sub)+'</div>':'')+'</div>');
}
ipcMain.handle('screens:identify',(e,items)=>{
  clearIdentify();
  if(!Array.isArray(items)) return false;
  for(const it of items.slice(0,8)){
    const d=it&&displayById(+it.id); if(!d) continue;
    const w=new BrowserWindow({x:d.bounds.x,y:d.bounds.y,width:d.bounds.width,height:d.bounds.height,frame:false,transparent:true,backgroundColor:'#00000000',resizable:false,movable:false,focusable:false,skipTaskbar:true,hasShadow:false,show:false,alwaysOnTop:true,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
    idWins.push(w);
    w.setBounds(d.bounds); w.setAlwaysOnTop(true,'screen-saver'); w.setIgnoreMouseEvents(true);
    w.webContents.once('did-finish-load',()=>{ if(!w.isDestroyed()) w.showInactive(); });
    w.loadURL(identifyPage(String(it.text||'').slice(0,12),String(it.sub||'').slice(0,40)));
  }
  idTimer=setTimeout(clearIdentify,2800);
  return idWins.length>0;
});

async function createWindow(){
  if(!fs.existsSync(path.join(EDITOR_DIR,'index.html'))){
    dialog.showErrorBox('Lyric Studio',mi18n.t('editor.missing')+EDITOR_DIR);
    app.quit(); return;
  }
  ffmpeg.register(EDITOR_DIR);
  const auth=desktopAuth.register({getWindow:()=>win,getOrigin:()=>origin});
  projects.register({getOrigin:()=>origin});
  const {port}=await startServer(EDITOR_DIR,PORT,auth);
  origin='http://127.0.0.1:'+port;
  Menu.setApplicationMenu(null);
  win=new BrowserWindow({
    width:1440,height:900,minWidth:1000,minHeight:650,backgroundColor:'#0b0a10',title:'Lyric Studio',icon:fs.existsSync(ICON)?ICON:undefined,
    webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false,
      additionalArguments:['--lyric-version='+app.getVersion()]}
  });
  win.webContents.setWindowOpenHandler(({url,frameName})=>{
    const site=siteTarget(url); if(site){ shell.openExternal(site); return {action:'deny'}; }
    if(frameName===WS_NAME&&url==='about:blank'){
      const out=wsTarget&&displayById(wsTarget.outputId), main=wsTarget&&displayById(wsTarget.mainId);
      const multi=!!(out&&main&&out.id!==main.id);
      const opts=multi?{x:out.bounds.x,y:out.bounds.y,width:out.bounds.width,height:out.bounds.height}:{width:1200,height:850};
      return {action:'allow',overrideBrowserWindowOptions:{...opts,backgroundColor:'#09070c',title:'Lyric Studio · WorkStation',autoHideMenuBar:true}};
    }
    if(url==='about:blank') return {action:'allow',overrideBrowserWindowOptions:{backgroundColor:'#ffffff',autoHideMenuBar:true}};
    if(url.startsWith(origin)) return {action:'allow'};
    if(/^(https?|mailto):/i.test(url)) shell.openExternal(url);
    return {action:'deny'};
  });
  win.webContents.on('did-create-window',(child,details)=>{
    if(details.frameName!==WS_NAME) return;
    wsWin=child; child.on('closed',()=>{ if(wsWin===child) wsWin=null; });
    try{ child.webContents.setBackgroundThrottling(false); }catch(e){}
    const out=wsTarget&&displayById(wsTarget.outputId), main=wsTarget&&displayById(wsTarget.mainId);
    if(!out||!main||out.id===main.id) return;
    child.setBounds(out.bounds); child.setFullScreen(true);
    if(win&&!win.isDestroyed()){ if(win.isFullScreen()) win.setFullScreen(false); if(win.isMaximized()) win.unmaximize(); win.setBounds(main.workArea); win.maximize(); }
  });
  win.webContents.on('will-navigate',(e,url)=>{ const site=siteTarget(url); if(site){ e.preventDefault(); shell.openExternal(site); return; } if(!url.startsWith(origin)){ e.preventDefault(); if(/^(https?|mailto):/i.test(url)) shell.openExternal(url); } });
  win.on('closed',()=>{ win=null; closeWs(); clearIdentify(); });
  // Recargar / volver al inicio del editor navega la ventana principal: el WorkStation ya no tiene a quién obedecer.
  win.webContents.on('did-start-navigation',(e,url,inPlace,isMain)=>{
    const main=(e&&typeof e.isMainFrame==='boolean')?e.isMainFrame:!!isMain, same=(e&&typeof e.isSameDocument==='boolean')?e.isSameDocument:!!inPlace;
    if(main&&!same) closeWs();
  });
  if(!app.isPackaged) win.webContents.on('before-input-event',(e,i)=>{
    if(i.type==='keyDown'&&(i.key==='F12'||(i.control&&i.shift&&String(i.key).toLowerCase()==='i'))){ win.webContents.toggleDevTools(); e.preventDefault(); }
  });
  win.webContents.on('did-finish-load',()=>{ win.webContents.executeJavaScript('window.i18n?i18n.getLang():null').then(c=>{ if(c) mi18n.setLang(c); }).catch(()=>{}); });
  win.loadURL(origin+'/index.html');
}

if(!app.requestSingleInstanceLock()) app.quit();
else{
  app.on('second-instance',()=>{ if(win){ if(win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(createWindow);
  app.on('window-all-closed',()=>app.quit());
}
