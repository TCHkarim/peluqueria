import {useState,useEffect} from 'react';import {sb} from './supabase.js';
const ST=['Desarrollo','Preproducción','Rodaje','Postproducción','Entregado'],MS=['Nuevo','Contactado','Cerrado'];
const PC={Desarrollo:'#6b7280',Preproducción:'#2563eb',Rodaje:'#b45309',Postproducción:'#7c3aed',Entregado:'#15803d',Nuevo:'#b45309',Contactado:'#2563eb',Cerrado:'#15803d'};
const T={projects:{n:'Proyectos',d:'Tus producciones y su estado.',f:[['title','Título'],['client','Cliente'],['category','Categoría'],['year','Año','number'],['status','Estado','sel',ST],['budget','Presupuesto (USD)','number'],['description','Descripción','area'],['credits','Ficha técnica'],['image_url','Portada','file'],['video_url','Video / tráiler','file']],c:['title','client','category','status','budget']},
services:{n:'Servicios',d:'Lo que ofrece la productora.',f:[['title','Título'],['description','Descripción','area']],c:['title','description']},
team:{n:'Equipo',d:'Personas que integran la productora.',f:[['name','Nombre'],['role','Puesto'],['bio','Bio','area'],['photo_url','Foto','file']],c:['name','role','bio']}};
const KEYS=[['brand','Nombre de la marca'],['hero_title','Título principal'],['hero_tagline','Frase'],['hero_video','Video del hero','file'],['hero_image','Imagen del hero','file'],['about_text','Sobre nosotros','area'],['email','Correo'],['whatsapp','WhatsApp (con código país)'],['instagram','URL de Instagram']];
const NAV=[['GENERAL',[['home','Resumen']]],['OPERACIÓN',[['projects','Proyectos'],['services','Servicios'],['team','Equipo']]],['COMERCIAL',[['messages','Propuestas']]],['ADMINISTRACIÓN',[['settings','Contenido web']]]];
const money=n=>'USD '+Number(n||0).toLocaleString('es-AR');
const csv=(rows,name)=>{if(!rows.length)return;const k=Object.keys(rows[0]),q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+[k.join(','),...rows.map(r=>k.map(c=>q(r[c])).join(','))].join('\n')],{type:'text/csv'}));a.download=name+'.csv';a.click()};
const Pill=({v})=><span className="pill" style={{color:PC[v]||'#6b7280',background:(PC[v]||'#6b7280')+'1a'}}>{v||'—'}</span>;
const Head=({n,d,children})=><div className="hd"><div><h1>{n}</h1><p>{d}</p></div><div className="hb">{children}</div></div>;
function Field({f,v,set}){const [k,l,t,o]=f,[b,setB]=useState(false);
const up=async e=>{const file=e.target.files[0];if(!file)return;setB(true);const n=Date.now()+'-'+file.name.replace(/[^\w.]/g,'_');
const {error}=await sb.storage.from('media').upload(n,file);setB(false);if(error)return alert(error.message);set(k,sb.storage.from('media').getPublicUrl(n).data.publicUrl)};
return <label>{l}{t==='area'?<textarea rows="4" value={v||''} onChange={e=>set(k,e.target.value)}/>:t==='sel'?<select value={v||o[0]} onChange={e=>set(k,e.target.value)}>{o.map(s=><option key={s}>{s}</option>)}</select>:<input type={t==='number'?'number':'text'} value={v??''} onChange={e=>set(k,e.target.value)}/>}
{t==='file'&&<input type="file" accept="image/*,video/*" onChange={up}/>}{b&&<small> Subiendo…</small>}</label>}
function Home({user}){const [d,setD]=useState({p:[],m:[],s:0,t:0});
useEffect(()=>{(async()=>{const [p,m,s,t]=await Promise.all([sb.from('projects').select('*'),sb.from('messages').select('*').order('created_at',{ascending:false}),sb.from('services').select('id'),sb.from('team').select('id')]);
setD({p:p.data||[],m:m.data||[],s:s.data?.length||0,t:t.data?.length||0})})()},[]);
const act=d.p.filter(x=>x.status&&x.status!=='Entregado'),nu=d.m.filter(x=>(x.status||'Nuevo')==='Nuevo');
const K=[['Proyectos activos',act.length,'de '+d.p.length+' en total'],['Cartera activa',money(act.reduce((a,x)=>a+Number(x.budget||0),0)),'presupuesto en curso'],['Propuestas nuevas',nu.length,'sin responder'],['Equipo',d.t,d.s+' servicios publicados']];
return <><Head n="Resumen" d={'Hola, '+(user.email||'')+'. Así está tu productora hoy.'}/>
<div className="kp">{K.map(k=><div className="panel kc" key={k[0]}><small>{k[0]}</small><b>{k[1]}</b><span>{k[2]}</span></div>)}</div>
<div className="two"><div className="panel pd"><h3>Proyectos en curso</h3>{act.length?act.map(p=><div className="li" key={p.id}><span>{p.title}<small>{p.client}</small></span><Pill v={p.status}/></div>):<p className="em">Sin proyectos activos.</p>}</div>
<div className="panel pd"><h3>Últimas propuestas</h3>{d.m.slice(0,6).map(m=><div className="li" key={m.id}><span>{m.name}<small>{m.project_type} · {m.budget}</small></span><Pill v={m.status||'Nuevo'}/></div>)}{!d.m.length&&<p className="em">Todavía no hay propuestas.</p>}</div></div></>}
function Table({t}){const C=T[t],[rows,setR]=useState([]),[f,setF]=useState(null),[q,setQ]=useState(''),[fl,setFl]=useState('');
const load=async()=>{const {data}=await sb.from(t).select('*');setR(data||[])};useEffect(()=>{load();setQ('');setFl('');setF(null)},[t]);
const lab=Object.fromEntries(C.f.map(x=>[x[0],x[1]])),vis=rows.filter(r=>(!fl||r.status===fl)&&JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
const save=async e=>{e.preventDefault();const {id,created_at,...r}=f,b=Object.fromEntries(Object.entries(r).map(([k,v])=>[k,v===''?null:v]));
const {error}=await(id?sb.from(t).update(b).eq('id',id):sb.from(t).insert(b));if(error)alert(error.message);else{setF(null);load()}};
const del=async id=>{if(confirm('¿Eliminar?')){await sb.from(t).delete().eq('id',id);load()}};
return <><Head n={C.n} d={C.d}><button className="b" onClick={()=>csv(rows,t)}>Exportar CSV</button><button className="b pr" onClick={()=>setF({})}>+ Nuevo</button></Head>
<div className="panel"><div className="tb"><input placeholder="Buscar…" value={q} onChange={e=>setQ(e.target.value)}/>{t==='projects'&&<select value={fl} onChange={e=>setFl(e.target.value)}><option value="">Todos los estados</option>{ST.map(s=><option key={s}>{s}</option>)}</select>}<small>{vis.length} registros</small></div>
<div className="ov"><table><thead><tr>{C.c.map(c=><th key={c}>{lab[c]}</th>)}<th/></tr></thead><tbody>{vis.map(r=><tr key={r.id}>{C.c.map(c=><td key={c}>{c==='status'?<Pill v={r[c]}/>:c==='budget'?money(r[c]):r[c]}</td>)}<td className="ac"><button onClick={()=>setF(r)}>Editar</button><button onClick={()=>del(r.id)}>Eliminar</button></td></tr>)}</tbody></table>{!vis.length&&<p className="em">Sin resultados.</p>}</div></div>
{f&&<div className="mo"><form onSubmit={save}><h3>{f.id?'Editar':'Nuevo'} · {C.n}</h3>{C.f.map(x=><Field key={x[0]} f={x} v={f[x[0]]} set={(k,v)=>setF(o=>({...o,[k]:v}))}/>)}<div className="ft"><button type="button" className="b" onClick={()=>setF(null)}>Cancelar</button><button className="b pr">Guardar</button></div></form></div>}</>}
function Msgs(){const [r,setR]=useState([]),[v,setV]=useState(null),[q,setQ]=useState('');
const load=async()=>{const {data}=await sb.from('messages').select('*').order('created_at',{ascending:false});setR(data||[])};useEffect(()=>{load()},[]);
const set=async(id,status)=>{await sb.from('messages').update({status}).eq('id',id);load()},del=async id=>{if(confirm('¿Eliminar?')){await sb.from('messages').delete().eq('id',id);load()}};
const vis=r.filter(m=>JSON.stringify(m).toLowerCase().includes(q.toLowerCase()));
return <><Head n="Propuestas" d="Mensajes recibidos desde el formulario de la web."><button className="b" onClick={()=>csv(r,'propuestas')}>Exportar CSV</button></Head>
<div className="panel"><div className="tb"><input placeholder="Buscar…" value={q} onChange={e=>setQ(e.target.value)}/><small>{vis.length} registros</small></div><div className="ov"><table><thead><tr><th>Fecha</th><th>Nombre</th><th>Correo</th><th>Tipo</th><th>Presupuesto</th><th>Estado</th><th/></tr></thead>
<tbody>{vis.map(m=><tr key={m.id}><td>{new Date(m.created_at).toLocaleDateString('es-AR')}</td><td>{m.name}<small>{m.company}</small></td><td><a href={'mailto:'+m.email}>{m.email}</a></td><td>{m.project_type}</td><td>{m.budget}</td>
<td><select value={m.status||'Nuevo'} onChange={e=>set(m.id,e.target.value)}>{MS.map(s=><option key={s}>{s}</option>)}</select></td><td className="ac"><button onClick={()=>setV(m)}>Ver</button><button onClick={()=>del(m.id)}>Eliminar</button></td></tr>)}</tbody></table>{!vis.length&&<p className="em">Sin propuestas.</p>}</div></div>
{v&&<div className="mo" onClick={()=>setV(null)}><div className="fm"><h3>{v.name}</h3><p><b>{v.project_type}</b> · {v.budget} · {v.company}</p><p style={{whiteSpace:'pre-wrap'}}>{v.message}</p><div className="ft"><a className="b pr" href={'mailto:'+v.email}>Responder</a><button className="b" onClick={()=>setV(null)}>Cerrar</button></div></div></div>}</>}
function Settings(){const [v,setV]=useState({});useEffect(()=>{sb.from('settings').select('*').then(({data})=>setV(Object.fromEntries((data||[]).map(r=>[r.key,r.value]))))},[]);
const save=async e=>{e.preventDefault();const {error}=await sb.from('settings').upsert(KEYS.map(([k])=>({key:k,value:v[k]||''})));alert(error?error.message:'Guardado')};
return <><Head n="Contenido web" d="Textos, imágenes y datos de contacto de la página pública."/><form className="panel pd fm2" onSubmit={save}>{KEYS.map(x=><Field key={x[0]} f={x} v={v[x[0]]} set={(k,val)=>setV(o=>({...o,[k]:val}))}/>)}<div className="ft"><button className="b pr">Guardar cambios</button></div></form></>}
export default function Admin(){const [u,setU]=useState(null),[tab,setTab]=useState('home'),[err,setErr]=useState('');
useEffect(()=>{if(!sb)return;sb.auth.getSession().then(({data})=>setU(data.session?.user||null));const {data:l}=sb.auth.onAuthStateChange((_,s)=>setU(s?.user||null));return()=>l.subscription.unsubscribe()},[]);
if(!sb)return <div className="ad lg"><p className="err">Faltan las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.</p></div>;
if(!u)return <div className="ad lg"><form className="panel pd" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.target);const {error}=await sb.auth.signInWithPassword({email:f.get('e'),password:f.get('p')});setErr(error?error.message:'')}}>
<h1>Panel de administración</h1><p>Ingresá con tu cuenta de administrador.</p><input name="e" type="email" placeholder="Correo" required/><input name="p" type="password" placeholder="Contraseña" required/><button className="b pr">Entrar</button>{err&&<p className="err">{err}</p>}<a href="#/">← Volver a la web</a></form></div>;
const name=[].concat(...NAV.map(g=>g[1])).find(x=>x[0]===tab)[1];
return <div className="ad"><aside><b className="br">◐ Panel</b>{NAV.map(([g,it])=><div key={g}><small>{g}</small>{it.map(([k,l])=><button key={k} className={k===tab?'on':''} onClick={()=>setTab(k)}>{l}</button>)}</div>)}</aside>
<main><div className="top"><span>Panel / <b>{name}</b></span><span><a href="#/">Ver web</a><button onClick={()=>sb.auth.signOut()}>Salir</button></span></div>
{tab==='home'?<Home user={u}/>:T[tab]?<Table t={tab}/>:tab==='messages'?<Msgs/>:<Settings/>}</main></div>}
