'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const arg=process.argv.find(a=>a.startsWith('--lyric-version='));
contextBridge.exposeInMainWorld('lyricDesktop',{
  version:arg?arg.split('=')[1]:'dev',
  auth:{
    begin:()=>ipcRenderer.invoke('auth:begin'),
    openExternal:u=>ipcRenderer.invoke('auth:openExternal',u),
    onResult:cb=>{ ipcRenderer.on('auth:result',(e,d)=>cb(d)); }
  },
  ffmpeg:{
    probe:()=>ipcRenderer.invoke('ff:probe'),
    test:spec=>ipcRenderer.invoke('ff:test',spec),
    chooseOutput:o=>ipcRenderer.invoke('ff:chooseOutput',o),
    stashAudio:o=>ipcRenderer.invoke('ff:stashAudio',o),
    discardAudio:t=>ipcRenderer.invoke('ff:discardAudio',t),
    start:req=>ipcRenderer.invoke('ff:start',req),
    write:(id,buf)=>ipcRenderer.invoke('ff:write',id,buf),
    finish:id=>ipcRenderer.invoke('ff:finish',id),
    cancel:id=>ipcRenderer.invoke('ff:cancel',id),
    reveal:t=>ipcRenderer.invoke('ff:reveal',t)
  },
  screens:{
    list:()=>ipcRenderer.invoke('screens:list'),
    identify:items=>ipcRenderer.invoke('screens:identify',items)
  },
  workstation:{
    prepare:t=>ipcRenderer.invoke('ws:prepare',t),
    toggleFullscreen:()=>ipcRenderer.invoke('ws:toggleFullscreen'),
    close:()=>ipcRenderer.invoke('ws:close')
  },
  feedback:{
    capture:()=>ipcRenderer.invoke('feedback:capture')
  },
  projects:{
    list:()=>ipcRenderer.invoke('proj:list'),
    save:(id,project)=>ipcRenderer.invoke('proj:save',id,project),
    read:id=>ipcRenderer.invoke('proj:read',id),
    readMedia:(id,key,offset,length)=>ipcRenderer.invoke('proj:readMedia',id,key,offset,length),
    mediaBegin:(id,key)=>ipcRenderer.invoke('proj:mediaBegin',id,key),
    mediaWrite:(id,key,buf)=>ipcRenderer.invoke('proj:mediaWrite',id,key,buf),
    mediaEnd:(id,key)=>ipcRenderer.invoke('proj:mediaEnd',id,key),
    mediaRemove:(id,key)=>ipcRenderer.invoke('proj:mediaRemove',id,key),
    remove:id=>ipcRenderer.invoke('proj:remove',id),
    reveal:id=>ipcRenderer.invoke('proj:reveal',id)
  }
});
