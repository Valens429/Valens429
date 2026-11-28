'use strict';
const {app,ipcMain,dialog,shell,BrowserWindow}=require('electron');
const {spawn,execFile}=require('child_process');
const path=require('path'),fs=require('fs'),os=require('os'),crypto=require('crypto');
const mt=require('./main-i18n').t;
let FF=null;

const EXE=process.platform==='win32'?'ffmpeg.exe':'ffmpeg';
const ffmpegBin=()=>process.env.LYRIC_FFMPEG||(app.isPackaged?path.join(process.resourcesPath,'ffmpeg',EXE):EXE);
const run=(args,ms)=>new Promise(res=>execFile(ffmpegBin(),args,{timeout:ms||20000,maxBuffer:16e6,windowsHide:true},(e,out,err)=>res({ok:!e,out:String(out||''),err:String(err||'')})));
const tok=()=>crypto.randomBytes(12).toString('hex');

let caps=null;
const outs=new Map(), audios=new Map(), jobs=new Map();

async function probe(){
  if(caps) return caps;
  const v=await run(['-hide_banner','-version'],8000);
  if(!v.ok) return null;
  const enc=await run(['-hide_banner','-encoders'],15000);
  const encoders=[...enc.out.matchAll(/^\s*[VA][A-Z.]{5}\s+(\S+)/gm)].map(m=>m[1]);
  const hw=FF.HW_NAMES.filter(n=>encoders.includes(n));
  const tests=await Promise.all(hw.map(async n=>{
    const s=FF.normalize({ext:'mp4',codec:FF.ENC[n].codec,w:640,h:360,fps:30,quality:'high',speed:2,bits:8},null);
    s.encoder=n; return (await run(FF.testArgs(s),15000)).ok?n:null;
  }));
  caps={version:(v.out.match(/version\s+(\S+)/)||[])[1]||'',encoders,working:tests.filter(Boolean),cpus:os.cpus().length,ramGB:Math.round(os.totalmem()/2**30)};
  return caps;
}

function finish(j,code,sig){
  j.closed=true; j.code=code;
  if(j.audioPath){ fs.unlink(j.audioPath,()=>{}); }
  j.waiters.forEach(f=>f()); j.waiters=[];
}

function register(editorDir){
  if(typeof globalThis.$t!=='function') globalThis.$t=k=>k;
  FF=require(path.join(editorDir,'ffmpeg-spec.js'));
  ipcMain.handle('ff:probe',()=>probe());

  ipcMain.handle('ff:test',async(e,raw)=>{
    const c=await probe(); if(!c) return false;
    const s=FF.normalize(raw,c); if(!s.encoder) return false;
    return (await run(FF.testArgs(s),30000)).ok;
  });

  ipcMain.handle('ff:chooseOutput',async(e,{name,ext})=>{
    const win=BrowserWindow.fromWebContents(e.sender), x=FF.CONTAINERS[ext]?ext:'mp4';
    const r=await dialog.showSaveDialog(win,{defaultPath:String(name||'video.'+x),filters:[{name:x.toUpperCase(),extensions:[x]}]});
    if(r.canceled||!r.filePath) return null;
    const file=r.filePath.toLowerCase().endsWith('.'+x)?r.filePath:r.filePath+'.'+x;
    const t=tok(); outs.set(t,file); return t;
  });

  ipcMain.handle('ff:stashAudio',async(e,{name,data})=>{
    const ext=(path.extname(String(name||''))||'.bin').replace(/[^.\w]/g,'').slice(0,8);
    const file=path.join(os.tmpdir(),'lyricstudio-'+tok()+ext);
    await fs.promises.writeFile(file,Buffer.from(data));
    const t=tok(); audios.set(t,file); return t;
  });

  ipcMain.handle('ff:discardAudio',async(e,t)=>{ const f=audios.get(t); if(!f) return; audios.delete(t); await fs.promises.unlink(f).catch(()=>{}); });

  ipcMain.handle('ff:start',async(e,req)=>{
    const c=await probe(); if(!c) throw new Error(mt('ff.not_found'));
    const out=outs.get(req.out); if(!out) throw new Error(mt('ff.bad_dest'));
    const audioPath=req.audio?audios.get(req.audio):null;
    const s=FF.normalize({...req.spec,w:req.w,h:req.h,fps:req.fps},c);
    if(!s.encoder) throw new Error(mt('ff.no_encoder'));
    const args=FF.buildArgs(s,{audioPath,out});
    const proc=spawn(ffmpegBin(),args,{stdio:['pipe','pipe','pipe'],windowsHide:true});
    const j={proc,out,audioPath,closed:false,code:null,err:'',waiters:[]}, id=tok();
    proc.stderr.on('data',d=>{ j.err=(j.err+d).slice(-4000); });
    proc.stdout.on('data',()=>{});
    proc.stdin.on('error',()=>{});
    proc.on('error',er=>{ j.err+=String(er.message); finish(j,-1); });
    proc.on('close',(code,sig)=>finish(j,code==null?-1:code,sig));
    jobs.set(id,j); return {id};
  });

  ipcMain.handle('ff:write',(e,id,data)=>new Promise((res,rej)=>{
    const j=jobs.get(id); if(!j||j.closed) return rej(new Error(mt('ff.stopped',{detail:(j&&j.err||mt('ff.no_detail'))})));
    const buf=Buffer.from(data.buffer,data.byteOffset,data.byteLength);
    const onClose=()=>rej(new Error(mt('ff.stopped',{detail:j.err})));
    j.waiters.push(onClose);
    const ok=()=>{ j.waiters=j.waiters.filter(f=>f!==onClose); res(); };
    if(j.proc.stdin.write(buf)) ok(); else j.proc.stdin.once('drain',ok);
  }));

  ipcMain.handle('ff:finish',async(e,id)=>{
    const j=jobs.get(id); if(!j) return {ok:false,error:mt('ff.unknown_job')};
    if(!j.closed){ await new Promise(r=>{ j.waiters.push(r); j.proc.stdin.end(); }); }
    jobs.delete(id);
    if(j.code!==0){ await fs.promises.unlink(j.out).catch(()=>{}); return {ok:false,error:j.err.trim().split('\n').slice(-3).join(' ')||mt('ff.failed')}; }
    return {ok:true};
  });

  ipcMain.handle('ff:cancel',async(e,id)=>{
    const j=jobs.get(id); if(!j) return;
    if(!j.closed){ await new Promise(r=>{ j.waiters.push(r); j.proc.kill(); }); }
    jobs.delete(id); await fs.promises.unlink(j.out).catch(()=>{});
  });

  ipcMain.handle('ff:reveal',(e,t)=>{ const f=outs.get(t); if(f) shell.showItemInFolder(f); });

  app.on('before-quit',()=>{ jobs.forEach(j=>{ try{ j.proc.kill(); }catch(_){} }); audios.forEach(f=>fs.unlink(f,()=>{})); });
}
module.exports={register};
