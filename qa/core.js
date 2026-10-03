/* Cepte Not v5: v4 fields are preserved; no credentials or UI dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CepteCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const KEY = 'cepte_not_qa_data_v5', LEGACY = 'cepte_not_qa_notes_v4';
  const STATUSES = ['Yapılacak', 'Devam Ediyor', 'Bekliyor', 'Tamamlandı', 'İptal'];
  const PRIORITIES = ['Acil', 'Yüksek', 'Normal', 'Düşük'];
  const DEFAULT_CATEGORIES = ['İş', 'Kişisel', 'Aile', 'Toplantı', 'Telefon', 'Takip', 'Fikir', 'Diğer', 'Market', 'Eğitim'];
  const COLORS = ['#4f46e5', '#0369a1', '#be185d', '#047857', '#b45309', '#7e22ce', '#475569'];
  const uid = () => 'note-' + (globalThis.crypto?.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2));
  const fold = s => String(s ?? '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
  const day = (value = new Date()) => {
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(+d) ? '' : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const date = s => new Date(String(s).slice(0, 10) + 'T12:00:00');
  const plusDay = (s, n) => { const d = date(s); d.setDate(d.getDate() + n); return day(d); };
  const delta = (s, today = day()) => s ? Math.round((Date.UTC(...s.slice(0,10).split('-').map((n,i)=>+n-(i===1?1:0))) - Date.UTC(...today.split('-').map((n,i)=>+n-(i===1?1:0)))) / 86400000) : null;
  const validDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && day(date(s)) === s;
  const validTime = s => s && !Number.isNaN(Date.parse(s)) ? String(s) : null;
  const normalize = (n, index = 0) => {
    if (!n || typeof n !== 'object' || Array.isArray(n)) return null;
    const priority = ({acil:'Acil',yuksek:'Yüksek',orta:'Normal',normal:'Normal',dusuk:'Düşük'})[fold(n.priority)] || 'Normal';
    const completed = !!(n.completed || n.done || n.status === 'Tamamlandı');
    const status = STATUSES.includes(n.status) ? n.status : completed ? 'Tamamlandı' : 'Yapılacak';
    const sub = Array.isArray(n.subTasks) ? n.subTasks : Array.isArray(n.items) ? n.items : [];
    const createdAt = validTime(n.createdAt) || '1970-01-01T00:00:00.000Z';
    return {...n, id: String(n.id || 'legacy-' + index), title: String(n.title || n.text || 'Başlıksız'), content: String(n.content || ''),
      category: String(n.category || 'Diğer'), priority, status, completed: status === 'Tamamlandı',
      subTasks: sub.filter(s=>s && typeof s === 'object').map((s,i)=>({...s,id:String(s.id||'sub-'+i),text:String(s.text||''),completed:!!(s.completed||s.done)})),
      createdAt, updatedAt: validTime(n.updatedAt) || createdAt,
      dueDate: validDate(n.dueDate) ? n.dueDate : null, startDate: validDate(n.startDate) ? n.startDate : null,
      alarmAt: validTime(n.alarmAt), alarmTriggered: !!n.alarmTriggered,
      tags: (Array.isArray(n.tags)? n.tags : typeof n.tags === 'string'? n.tags.split(/[,;]+/) : []).map(String).map(t=>t.trim().replace(/^#/,'')).filter(Boolean),
      waitingFor: String(n.waitingFor||''), waitingSince: validDate(n.waitingSince)?n.waitingSince:null,
      checkDate: validDate(n.checkDate)?n.checkDate:null, waitingNote:String(n.waitingNote||''), notes:String(n.notes||''),
      links:(Array.isArray(n.links)?n.links:[]).map(String), attachments: Array.isArray(n.attachments)?n.attachments:[],
      pinned:!!n.pinned, archivedAt:validTime(n.archivedAt), deletedAt:validTime(n.deletedAt),
      completedAt:status==='Tamamlandı' ? validTime(n.completedAt)||validTime(n.updatedAt)||null : null,
      repeat: ['none','daily','weekdays','weekly','monthly','yearly','custom'].includes(n.repeat)?n.repeat:'none',
      repeatEvery:Math.max(1,Math.min(366,Number(n.repeatEvery)||1)), repeatUnit:['days','weeks','months'].includes(n.repeatUnit)?n.repeatUnit:'days',
      repeatDays:(Array.isArray(n.repeatDays)?n.repeatDays:[]).map(Number).filter(x=>Number.isInteger(x)&&x>=0&&x<=6),
      recurrenceParent:n.recurrenceParent||null, nextOccurrenceId:n.nextOccurrenceId||null};
  };
  function migrate(input) {
    const list = Array.isArray(input) ? input : input && Array.isArray(input.notes) ? input.notes : null;
    if (!list) throw new Error('Geçerli not listesi bulunamadı.');
    if (input?.dataVersion > 5) throw new Error('Bu yedek daha yeni bir uygulama sürümüne ait.');
    const notes = [], seen = new Set();
    list.forEach((n,i)=>{const note=normalize(n,i);if(note){if(seen.has(note.id))note.id=uid();seen.add(note.id);notes.push(note);}});
    const categories = Array.isArray(input.categories)?input.categories.filter(c=>c&&typeof c.name==='string').map((c,i)=>({name:c.name,color:COLORS.includes(c.color)?c.color:COLORS[i%COLORS.length],icon:String(c.icon||'tag')})):[];
    [...(Array.isArray(input.categories)?['Diğer']:DEFAULT_CATEGORIES),...notes.map(n=>n.category)].forEach((name,i)=>{if(!categories.some(c=>c.name===name))categories.push({name,color:COLORS[i%COLORS.length],icon:name==='İş'?'briefcase':name==='Kişisel'?'user':'tag'});});
    return {dataVersion:5,notes,categories,categoriesUpdatedAt:validTime(input.categoriesUpdatedAt)||'1970-01-01T00:00:00.000Z',settings:{theme:input.settings?.theme||'system',autoArchive:!!input.settings?.autoArchive},
      tombstones: Array.isArray(input.tombstones)?input.tombstones.filter(t=>t&&t.id&&validTime(t.deletedAt)):[]};
  }
  function load(storage) {
    const issues=[]; let current=storage.getItem(KEY), old=storage.getItem(LEGACY), state;
    if(current){try{state=migrate(JSON.parse(current));}catch(e){issues.push('Son kayıt okunamadı; güvenli yedek deneniyor.');}}
    if(!state&&current){const last=storage.getItem(KEY+'_lastgood');if(last){try{state=migrate(JSON.parse(last));}catch{}}}
    if(!state&&old){try{const parsed=JSON.parse(old);state=migrate(parsed);storage.setItem('cepte_not_qa_v4_backup',old);}catch(e){issues.push('Eski kayıtlar okunamadı. Ham veri korunuyor.');}}
    if(!state)state=migrate([]);
    if(!current && old && !issues.length) { storage.setItem(KEY,JSON.stringify(state)); }
    return {state,issues};
  }
  const active = n => !n.deletedAt && !n.archivedAt && !['Tamamlandı','İptal'].includes(n.status);
  const due = n => n.status==='Bekliyor' ? n.checkDate || n.dueDate : n.dueDate;
  function bucket(n, today=day()) {
    const d=delta(due(n),today);if(d===null)return 'undated';if(d<0)return 'overdue';if(d===0)return 'today';if(d===1)return 'tomorrow';
    const weekday=date(today).getDay()||7;return d<=7-weekday?'week':'future';
  }
  function matches(n, filters={}, query='', today=day()) {
    const q=fold(query.trim());const commands={bugun:'today',yarin:'tomorrow',geciken:'overdue',bekleyen:'waiting',tamamlanan:'completed'};
    const shortcut=commands[q];
    if(shortcut==='waiting'&&n.status!=='Bekliyor'||shortcut==='completed'&&n.status!=='Tamamlandı')return false;
    if(shortcut&& !['waiting','completed'].includes(shortcut)&&(!active(n)||bucket(n,today)!==shortcut))return false;
    if(q&&!shortcut){if(q.startsWith('#')){if(!n.tags.some(t=>fold(t).includes(q.slice(1))))return false;}else if(!fold([n.title,n.content,n.category,n.waitingFor,n.waitingNote,n.notes,...n.tags,...n.subTasks.map(s=>s.text)].join(' ')).includes(q))return false;}
    for(const k of ['status','category','priority'])if(filters[k]&&n[k]!==filters[k])return false;
    if(filters.tag&&!n.tags.some(t=>fold(t)===fold(filters.tag)))return false;
    if(filters.date && bucket(n,today)!==filters.date)return false;
    if(filters.completion==='done'&&!n.completed||filters.completion==='open'&&n.completed)return false;
    return true;
  }
  function sortNotes(notes, mode='smart', today=day()) {
    const weight=n=>{const b=bucket(n,today);return !active(n)?9:b==='overdue'?n.priority==='Acil'?0:1:b==='today'?n.priority==='Acil'?2:3:delta(due(n),today)>0&&delta(due(n),today)<=7&&['Acil','Yüksek'].includes(n.priority)?4:n.status==='Bekliyor'?5:b==='undated'?7:6;};
    return [...notes].sort((a,b)=>Number(b.pinned)-Number(a.pinned)||(mode==='newest'? Date.parse(b.createdAt)-Date.parse(a.createdAt):mode==='oldest'?Date.parse(a.createdAt)-Date.parse(b.createdAt):mode==='date'?(due(a)||'9999').localeCompare(due(b)||'9999'):mode==='priority'?PRIORITIES.indexOf(a.priority)-PRIORITIES.indexOf(b.priority):mode==='alpha'?a.title.localeCompare(b.title,'tr'):weight(a)-weight(b)||(due(a)||'9999').localeCompare(due(b)||'9999')||PRIORITIES.indexOf(a.priority)-PRIORITIES.indexOf(b.priority))||a.title.localeCompare(b.title,'tr'));
  }
  function monthShift(s, months) {const d=date(s), target=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+months);const end=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(target,end));return day(d);}
  function nextDate(n, today=day()) {
    const base=n.dueDate|| (n.alarmAt?day(n.alarmAt):today);let s=base;
    const advance=s=>n.repeat==='monthly'?monthShift(s,1):n.repeat==='yearly'?monthShift(s,12):n.repeat==='custom'&&n.repeatUnit==='months'?monthShift(s,n.repeatEvery):plusDay(s,n.repeat==='weekly'&&!n.repeatDays.length?7:n.repeat==='custom'?n.repeatEvery*(n.repeatUnit==='weeks'?7:1):1);
    // Iterate from the scheduled date; completing late skips already elapsed occurrences.
    for(let i=0;i<4000;i++){s=advance(s);const dow=date(s).getDay();if(s>today&&(n.repeat!=='weekdays'||dow!==0&&dow!==6)&&(n.repeat!=='weekly'||!n.repeatDays.length||n.repeatDays.includes(dow)))return s;}
    return plusDay(today,1);
  }
  function complete(state,id,now=new Date()) {
    const n=state.notes.find(n=>n.id===id);if(!n)return;
    const iso=now.toISOString();const reopening=n.status==='Tamamlandı';
    n.status=reopening?'Yapılacak':'Tamamlandı';n.completed=!reopening;n.completedAt=reopening?null:iso;n.updatedAt=iso;
    n.subTasks.forEach(s=>s.completed=!reopening);
    if(!reopening&&n.repeat!=='none'&&!n.nextOccurrenceId){
      const next=nextDate(n,day(now)), copy=normalize({...n,id:uid(),status:'Yapılacak',completed:false,completedAt:null,createdAt:iso,updatedAt:iso,dueDate:next,
        archivedAt:null,deletedAt:null,alarmTriggered:false,subTasks:n.subTasks.map(s=>({...s,completed:false})),recurrenceParent:n.id,nextOccurrenceId:null});
      if(n.alarmAt){const alarm=new Date(n.alarmAt);const shift=delta(next,n.dueDate||day(n.alarmAt));alarm.setDate(alarm.getDate()+shift);copy.alarmAt=alarm.toISOString();}
      if(n.checkDate)copy.checkDate=plusDay(n.checkDate,delta(next,n.dueDate||day(now)));
      if(n.startDate)copy.startDate=plusDay(n.startDate,delta(next,n.dueDate||day(now)));
      n.nextOccurrenceId=copy.id;state.notes.push(copy);
    }
  }
  function merge(local, remote) {
    const other=migrate(remote), result=migrate(local), records=new Map(result.notes.map(n=>[n.id,n]));
    const tombs=new Map([...other.tombstones,...result.tombstones].map(t=>[String(t.id),t]));
    other.notes.forEach(n=>{const old=records.get(n.id);if(!old||Date.parse(n.updatedAt)>Date.parse(old.updatedAt))records.set(n.id,n);});
    result.notes=[...records.values()].filter(n=>!tombs.has(n.id)||Date.parse(n.updatedAt)>Date.parse(tombs.get(n.id).deletedAt));
    result.notes.forEach(n=>{if(tombs.has(n.id))tombs.delete(n.id);});result.tombstones=[...tombs.values()];
    if(Date.parse(other.categoriesUpdatedAt)>Date.parse(result.categoriesUpdatedAt)){result.categories=other.categories;result.categoriesUpdatedAt=other.categoriesUpdatedAt;}
    result.notes.forEach(n=>{if(!result.categories.some(c=>c.name===n.category)){const c=other.categories.find(c=>c.name===n.category);result.categories.push(c||{name:n.category,color:COLORS[0],icon:'tag'});}});return result;
  }
  function housekeeping(state,now=new Date()) {
    let changed=false;const today=day(now);
    state.notes=state.notes.filter(n=>{if(n.deletedAt&&delta(day(n.deletedAt),today)<-30){state.tombstones.push({id:n.id,deletedAt:now.toISOString()});changed=true;return false;}
      if(state.settings.autoArchive&&n.completedAt&&n.completed&&!n.archivedAt&&!n.deletedAt&&delta(day(n.completedAt),today)<=-7){n.archivedAt=now.toISOString();n.updatedAt=now.toISOString();changed=true;}return true;});return changed;
  }
  const csv = notes => '\uFEFF'+[['Başlık','Açıklama','Kategori','Öncelik','Durum','Oluşturma Tarihi','Son Tarih','Tamamlanma Tarihi','Etiketler'],...notes.map(n=>[n.title,n.content,n.category,n.priority,n.status,n.createdAt,n.dueDate||'',n.completedAt||'',n.tags.join(', ')])].map(row=>row.map(v=>'"'+String(v).replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"').join(';')).join('\r\n');
  return {KEY,LEGACY,STATUSES,PRIORITIES,DEFAULT_CATEGORIES,COLORS,uid,fold,day,date,plusDay,delta,normalize,migrate,load,active,due,bucket,matches,sortNotes,monthShift,nextDate,complete,merge,housekeeping,csv};
});
