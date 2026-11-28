'use strict';
const {ipcMain,shell}=require('electron');
const crypto=require('crypto');
const pending=new Map();
const TTL=60*60*1000;

function register({getWindow,getOrigin}){
  const sweep=()=>{ const now=Date.now(); pending.forEach((exp,k)=>{ if(exp<now) pending.delete(k); }); };
  ipcMain.handle('auth:begin',()=>{
    sweep(); const n=crypto.randomBytes(16).toString('hex'); pending.set(n,Date.now()+TTL);
    return {redirectTo:getOrigin()+'/auth-callback/'+n};
  });
  ipcMain.handle('auth:openExternal',(e,url)=>{
    try{ const u=new URL(url); if(u.protocol!=='https:') return false; shell.openExternal(u.href); return true; }catch(_){ return false; }
  });
  return {
    consume(n){ const exp=pending.get(n); if(!exp||exp<Date.now()) return false; pending.delete(n); return true; },
    deliver(payload){ const w=getWindow(); if(!w) return; w.webContents.send('auth:result',payload); if(w.isMinimized()) w.restore(); w.show(); w.focus(); }
  };
}
module.exports={register};
