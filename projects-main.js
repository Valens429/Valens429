'use strict';
const mt=require('./main-i18n').t;
const {app,ipcMain,shell}=require('electron');
const path=require('path'),fs=require('fs'),fsp=fs.promises;

const KEYS=['audio','image','video','watermark'];
const ID_RE=/^[a-f0-9-]{8,64}$/;
const CHUNK_MAX=32*1024*1024;

const root=()=>path.join(app.getPath('userData'),'projects');
function dirOf(id){ if(typeof id!=='string'||!ID_RE.test(id)) throw new Error(mt('pj.bad_id')); return path.join(root(),id); }
function mediaPath(id,key){ if(!KEYS.includes(key)) throw new Error(mt('pj.bad_media')); return path.join(dirOf(id),key+'.bin'); }
const toBuf=d=>Buffer.isBuffer(d)?d:Buffer.from(d.buffer?d.buffer:d,d.byteOffset||0,d.byteLength);

async function writeAtomic(file,data){
  const tmp=file+'.tmp';
  await fsp.writeFile(tmp,data);
  await fsp.rename(tmp,file);
}

async function list(){
  let ids=[];
  try{ ids=(await fsp.readdir(root(),{withFileTypes:true})).filter(d=>d.isDirectory()&&ID_RE.test(d.name)).map(d=>d.name); }
  catch(e){ return []; }
  const out=[];
  for(const id of ids){
    try{ out.push(JSON.parse(await fsp.readFile(path.join(root(),id,'meta.json'),'utf8'))); }
    catch(e){ }
  }
  return out.sort((a,b)=>String(b.savedAt).localeCompare(String(a.savedAt)));
}

async function save(id,project){
  const dir=dirOf(id);
  if(!project||typeof project!=='object'||!Array.isArray(project.lines)) throw new Error(mt('pj.bad_project'));
  await fsp.mkdir(dir,{recursive:true});
  project.id=id;
  const json=JSON.stringify(project);
  await writeAtomic(path.join(dir,'project.json'),json);
  let bytes=Buffer.byteLength(json);
  const media={};
  for(const k of KEYS){
    try{ const st=await fsp.stat(mediaPath(id,k)); bytes+=st.size; const a=project.assets&&project.assets[k]; media[k]=(a&&a.name)||k; }catch(e){}
  }
  const meta={id,name:String(project.name||''),savedAt:project.savedAt||new Date().toISOString(),lines:project.lines.length,media,bytes};
  await writeAtomic(path.join(dir,'meta.json'),JSON.stringify(meta));
  return meta;
}

async function read(id){
  const dir=dirOf(id);
  const project=JSON.parse(await fsp.readFile(path.join(dir,'project.json'),'utf8'));
  const media={};
  for(const k of KEYS){ try{ media[k]={size:(await fsp.stat(mediaPath(id,k))).size}; }catch(e){} }
  return {project,media};
}
async function readMedia(id,key,offset,length){
  const len=Math.max(0,Math.min(Number(length)||0,CHUNK_MAX));
  const fh=await fsp.open(mediaPath(id,key),'r');
  try{ const b=Buffer.alloc(len); const {bytesRead}=await fh.read(b,0,len,Number(offset)||0); return b.subarray(0,bytesRead); }
  finally{ await fh.close(); }
}

const sessions=new Map();
async function mediaBegin(id,key){
  const final=mediaPath(id,key),tag=id+'/'+key,old=sessions.get(tag);
  if(old){ try{ await old.fh.close(); }catch(e){} sessions.delete(tag); }
  await fsp.mkdir(dirOf(id),{recursive:true});
  const tmp=final+'.tmp';
  sessions.set(tag,{fh:await fsp.open(tmp,'w'),tmp,final});
}
async function mediaWrite(id,key,data){
  const s=sessions.get(id+'/'+key); if(!s) throw new Error(mt('pj.no_write'));
  const b=toBuf(data); if(b.length>CHUNK_MAX) throw new Error(mt('pj.chunk_too_big'));
  await s.fh.write(b,0,b.length);
}
async function mediaEnd(id,key){
  const tag=id+'/'+key,s=sessions.get(tag); if(!s) throw new Error(mt('pj.no_write'));
  sessions.delete(tag);
  await s.fh.close();
  await fsp.rename(s.tmp,s.final);
}
async function mediaRemove(id,key){ try{ await fsp.unlink(mediaPath(id,key)); }catch(e){ if(e.code!=='ENOENT') throw e; } }

async function remove(id){
  const dir=dirOf(id);
  try{ await shell.trashItem(dir); }
  catch(e){ await fsp.rm(dir,{recursive:true,force:true}); }
}
function reveal(id){
  if(id) shell.showItemInFolder(path.join(dirOf(id),'project.json'));
  else{ fs.mkdirSync(root(),{recursive:true}); shell.openPath(root()); }
}

function register({getOrigin}){
  const guard=fn=>(e,...a)=>{
    const o=getOrigin&&getOrigin(),url=(e.senderFrame&&e.senderFrame.url)||e.sender.getURL();
    if(!o||!String(url).startsWith(o)) throw new Error(mt('pj.bad_origin'));
    return fn(...a);
  };
  ipcMain.handle('proj:list',guard(list));
  ipcMain.handle('proj:save',guard(save));
  ipcMain.handle('proj:read',guard(read));
  ipcMain.handle('proj:readMedia',guard(readMedia));
  ipcMain.handle('proj:mediaBegin',guard(mediaBegin));
  ipcMain.handle('proj:mediaWrite',guard(mediaWrite));
  ipcMain.handle('proj:mediaEnd',guard(mediaEnd));
  ipcMain.handle('proj:mediaRemove',guard(mediaRemove));
  ipcMain.handle('proj:remove',guard(remove));
  ipcMain.handle('proj:reveal',guard(reveal));
}

module.exports={register};
