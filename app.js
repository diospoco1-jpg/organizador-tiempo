'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const STORE_KEY = 'organiza-tiempo-v1';
const DAY_NAMES = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const DAY_FULL = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const parseISO = (value) => {
  const [y,m,d] = value.split('-').map(Number);
  return new Date(y, m-1, d, 12, 0, 0);
};
const dateISO = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const escapeHTML = (value='') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const timeToMinutes = (time) => { if (!time) return null; const [h,m]=time.split(':').map(Number); return h*60+m; };
const minutesToTime = (mins) => `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;
const formatTime = (time) => time ? new Intl.DateTimeFormat('es-SV',{hour:'numeric',minute:'2-digit'}).format(new Date(`2000-01-01T${time}:00`)) : 'Sin hora';
const formatDateLong = (iso) => { const d=parseISO(iso); return `${DAY_FULL[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`; };
const shortDate = (iso) => { const d=parseISO(iso); return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}`; };
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

let state = loadState();
let selectedDate = todayISO();
let weekOffset = 0;
let taskFilter = 'all';
let editingTaskId = null;
let installPrompt = null;
let toastTimer;

function loadState() {
  const defaults = {tasks:[], routines:[], settings:{theme:'violet',dayStart:'07:00',dayEnd:'21:00'}};
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return defaults;
    return {tasks:Array.isArray(parsed.tasks)?parsed.tasks:[], routines:Array.isArray(parsed.routines)?parsed.routines:[], settings:{...defaults.settings,...(parsed.settings||{})}};
  } catch { return defaults; }
}
function persist() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function showToast(message) {
  const toast=$('#toast'); toast.textContent=message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove('show'),2500);
}
function applyTheme() {
  document.body.dataset.theme=state.settings.theme || 'violet';
  $$('.theme-option').forEach(btn=>btn.classList.toggle('selected',btn.dataset.themeChoice===state.settings.theme));
  $('meta[name="theme-color"]').setAttribute('content', getComputedStyle(document.body).getPropertyValue('--primary').trim() || '#7256d9');
}
function switchTab(tab) {
  $$('.screen').forEach(screen=>screen.classList.toggle('active',screen.id===`screen-${tab}`));
  $$('.nav-item').forEach(btn=>btn.classList.toggle('active',btn.dataset.tab===tab));
  $('#floatingAdd').style.display = ['today','tasks','calendar'].includes(tab) && window.matchMedia('(min-width: 900px)').matches ? 'block' : 'none';
  if (tab==='today') renderToday();
  if (tab==='calendar') renderCalendar();
  if (tab==='tasks') renderTasks();
  if (tab==='routines') renderRoutines();
  window.scrollTo({top:0,behavior:'smooth'});
}
function getRoutineEvents(iso) {
  const day=parseISO(iso).getDay();
  return state.routines.filter(r=>r.days.includes(day)).map(r=>({kind:'routine',id:r.id,title:r.title,startTime:r.startTime,duration:Number(r.duration),category:'Rutina'}));
}
function getDayTasks(iso) { return state.tasks.filter(t=>t.date===iso); }
function getDayEvents(iso) {
  const tasks=getDayTasks(iso).filter(t=>t.startTime).map(t=>({kind:'task',...t}));
  return [...tasks,...getRoutineEvents(iso)].sort((a,b)=>(timeToMinutes(a.startTime)??0)-(timeToMinutes(b.startTime)??0));
}
function renderHeader() {
  const now=new Date();
  $('#topDate').textContent=new Intl.DateTimeFormat('es-SV',{weekday:'short',day:'numeric',month:'short'}).format(now).replace('.', '');
  $('#greeting').textContent=now.getHours()<12?'BUENOS DÍAS':now.getHours()<18?'BUENAS TARDES':'BUENAS NOCHES';
  const date=parseISO(selectedDate);
  $('#stampDay').textContent=String(date.getDate()).padStart(2,'0');
  $('#stampMonth').textContent=MONTHS[date.getMonth()].slice(0,3).toUpperCase();
  $('#selectedDateLabel').textContent=formatDateLong(selectedDate);
}
function priorityLabel(priority) { return Number(priority)===3?'Alta':Number(priority)===2?'Media':'Baja'; }
function eventCard(event, index, total) {
  const duration=Number(event.duration)||0;
  const end=timeToMinutes(event.startTime)+duration;
  const tag=event.kind==='routine'?'Rutina':event.completed?'Completada':priorityLabel(event.priority);
  const tagClass=event.kind==='routine'?'routine':event.completed?'done':'';
  const editAction=event.kind==='task'?`<button class="tiny-action" type="button" data-edit-task="${escapeHTML(event.id)}" aria-label="Editar ${escapeHTML(event.title)}">✎</button><button class="tiny-action" type="button" data-delete-task="${escapeHTML(event.id)}" aria-label="Eliminar ${escapeHTML(event.title)}">×</button>`:'';
  return `<div class="timeline-event">
    <span class="event-time">${escapeHTML(formatTime(event.startTime))}</span>
    <span class="event-rail" aria-hidden="true"></span>
    <div class="event-info"><strong>${escapeHTML(event.title)}</strong><small>${duration} min · ${escapeHTML(event.category||'Actividad')}${end>=0?` · termina ${escapeHTML(formatTime(minutesToTime(end)))}`:''}</small></div>
    <div class="event-actions"><span class="event-tag ${tagClass}">${tag}</span>${editAction}</div>
  </div>`;
}
function renderTimeline(target, iso) {
  const container=$(target);
  const events=getDayEvents(iso);
  const pending=getDayTasks(iso).filter(t=>!t.completed);
  const unscheduled=pending.filter(t=>!t.startTime);
  if (!events.length && !unscheduled.length) {
    container.innerHTML=`<div class="empty-state"><div class="empty-icon">☼</div><strong>Tu agenda está despejada</strong><p>Agrega una tarea o crea una rutina para empezar a organizar este día.</p></div>`;
    return;
  }
  container.innerHTML=events.map((event,i)=>eventCard(event,i,events.length)).join('') || '';
  if (unscheduled.length) {
    container.innerHTML+=`<div class="unscheduled-box"><strong>${unscheduled.length} ${unscheduled.length===1?'tarea pendiente de horario':'tareas pendientes de horario'}</strong><p>${unscheduled.map(t=>escapeHTML(t.title)).join(' · ')}</p></div>`;
  }
}
function renderToday() {
  renderHeader();
  const tasks=getDayTasks(selectedDate);
  const pending=tasks.filter(t=>!t.completed);
  const done=tasks.filter(t=>t.completed);
  const plannedMinutes=tasks.filter(t=>t.startTime&&!t.completed).reduce((sum,t)=>sum+Number(t.duration||0),0);
  $('#statPending').textContent=pending.length;
  $('#statPlanned').textContent=plannedMinutes>=60?`${(plannedMinutes/60).toFixed(plannedMinutes%60===0?0:1)} h`:`${plannedMinutes} min`;
  $('#statDone').textContent=tasks.length?`${Math.round(done.length/tasks.length*100)}%`:'0%';
  $('#optimizeBtn').disabled=pending.length===0;
  $('#optimizeBtn').style.opacity=pending.length===0?'.6':'1';
  renderTimeline('#todayTimeline',selectedDate);
}
function mondayOf(date) { const d=new Date(date); d.setHours(12,0,0,0); const day=d.getDay(); d.setDate(d.getDate()+(day===0?-6:1-day)); return d; }
function renderCalendar() {
  const start=mondayOf(parseISO(todayISO())); start.setDate(start.getDate()+weekOffset*7);
  const end=new Date(start); end.setDate(end.getDate()+6);
  $('#weekLabel').textContent=`${start.getDate()} ${MONTHS[start.getMonth()].slice(0,3)} – ${end.getDate()} ${MONTHS[end.getMonth()].slice(0,3)}`;
  $('#weekStrip').innerHTML=Array.from({length:7},(_,i)=>{
    const d=new Date(start);d.setDate(start.getDate()+i);const iso=dateISO(d);const count=getDayTasks(iso).length+getRoutineEvents(iso).length;
    return `<button type="button" class="day-cell ${iso===selectedDate?'selected':''} ${count?'has-events':''}" data-date="${iso}"><small>${DAY_NAMES[d.getDay()]}</small><strong>${d.getDate()}</strong><i></i></button>`;
  }).join('');
  const tasks=getDayTasks(selectedDate); const done=tasks.filter(t=>t.completed).length; const routines=getRoutineEvents(selectedDate).length;
  $('#calendarSummary').innerHTML=`<strong>${tasks.length} ${tasks.length===1?'tarea':'tareas'}</strong> · ${done} completadas · ${routines} ${routines===1?'rutina':'rutinas'} programadas`;
  $('#calendarDayTitle').textContent=formatDateLong(selectedDate);
  renderTimeline('#calendarTimeline',selectedDate);
}
function renderTasks() {
  let tasks=[...state.tasks].sort((a,b)=>a.date.localeCompare(b.date)||(a.startTime||'99:99').localeCompare(b.startTime||'99:99'));
  if(taskFilter==='pending')tasks=tasks.filter(t=>!t.completed);
  if(taskFilter==='done')tasks=tasks.filter(t=>t.completed);
  $('#tasksList').innerHTML=tasks.length?tasks.map(t=>`<article class="task-card ${t.completed?'completed':''}">
    <button class="check-task" data-toggle-task="${escapeHTML(t.id)}" type="button" aria-label="${t.completed?'Marcar pendiente':'Completar'}">${t.completed?'✓':''}</button>
    <div class="task-main"><strong>${escapeHTML(t.title)}</strong><div class="task-meta"><span>${escapeHTML(shortDate(t.date))}</span><span>·</span><span>${escapeHTML(t.startTime?formatTime(t.startTime):'Sin hora')}</span><span>·</span><span>${Number(t.duration)} min</span><span>·</span><span><i class="priority-dot priority-${Number(t.priority)===3?'high':Number(t.priority)===2?'medium':'low'}"></i>${priorityLabel(t.priority)}</span></div></div>
    <button class="task-menu" data-edit-task="${escapeHTML(t.id)}" type="button" aria-label="Editar tarea">✎</button><button class="task-menu" data-delete-task="${escapeHTML(t.id)}" type="button" aria-label="Eliminar tarea">×</button>
  </article>`).join(''):`<div class="empty-state"><div class="empty-icon">☷</div><strong>No hay tareas en esta lista</strong><p>Cuando agregues actividades, aparecerán aquí.</p></div>`;
}
function renderRoutines() {
  $('#routinesList').innerHTML=state.routines.length?[...state.routines].sort((a,b)=>a.startTime.localeCompare(b.startTime)).map(r=>`<article class="routine-card"><span class="routine-symbol">↻</span><div class="task-main"><strong>${escapeHTML(r.title)}</strong><small>${escapeHTML(formatTime(r.startTime))} · ${Number(r.duration)} minutos</small><div class="day-chips">${[1,2,3,4,5,6,0].filter(d=>r.days.includes(d)).map(d=>`<span>${DAY_NAMES[d]}</span>`).join('')}</div></div><button class="task-menu" data-delete-routine="${escapeHTML(r.id)}" type="button" aria-label="Eliminar rutina">×</button></article>`).join(''):`<div class="empty-state"><div class="empty-icon">↻</div><strong>Todavía no tienes rutinas</strong><p>Agrega tus actividades frecuentes para verlas automáticamente en tu semana.</p></div>`;
}
function openTaskDialog(task=null) {
  editingTaskId=task?.id||null;
  $('#taskDialogTitle').textContent=task?'Editar tarea':'Nueva tarea';
  $('#taskTitle').value=task?.title||'';
  $('#taskDate').value=task?.date||selectedDate;
  $('#taskDuration').value=String(task?.duration||30);
  $('#taskPriority').value=String(task?.priority||2);
  $('#taskDeadline').value=task?.deadline||'';
  $('#taskCategory').value=task?.category||'Estudio';
  $('#taskStartTime').value=task?.startTime||'';
  $('#taskNotes').value=task?.notes||'';
  $('#taskDialog').showModal();
  setTimeout(()=>$('#taskTitle').focus(),80);
}
function saveTask(event) {
  event.preventDefault();
  const form=new FormData(event.currentTarget);
  const title=String(form.get('title')||'').trim();
  if(!title){showToast('Escribe el nombre de la actividad.');return;}
  const old=state.tasks.find(t=>t.id===editingTaskId);
  const startTime=String(form.get('startTime')||'')||null;
  const task={id:editingTaskId||uid(),title,date:String(form.get('date')),duration:Number(form.get('duration')),priority:Number(form.get('priority')),deadline:String(form.get('deadline')||''),category:String(form.get('category')),startTime,notes:String(form.get('notes')||'').trim(),completed:old?.completed||false,autoScheduled:startTime&&old?.startTime===startTime?Boolean(old?.autoScheduled):false};
  if(editingTaskId)state.tasks=state.tasks.map(t=>t.id===editingTaskId?task:t);else state.tasks.push(task);
  selectedDate=task.date;persist();$('#taskDialog').close();event.currentTarget.reset();renderAll();showToast(editingTaskId?'Tarea actualizada.':'Tarea guardada en tu agenda.');editingTaskId=null;
}
function toggleTask(id) { state.tasks=state.tasks.map(t=>t.id===id?{...t,completed:!t.completed}:t);persist();renderAll(); }
function editTask(id) { const task=state.tasks.find(t=>t.id===id);if(task)openTaskDialog(task); }
function deleteTask(id) { const task=state.tasks.find(t=>t.id===id);if(!task)return;if(!window.confirm(`¿Eliminar la tarea \"${task.title}\"?`))return;state.tasks=state.tasks.filter(t=>t.id!==id);persist();renderAll();showToast('Tarea eliminada.'); }
function priorityScore(task) {
  let score=Number(task.priority)*35;
  if(task.deadline){const delta=Math.ceil((parseISO(task.deadline)-parseISO(task.date))/86400000);score+=delta<=0?120:delta===1?95:delta<=3?70:delta<=7?45:15;}
  if(task.duration<=30)score+=8;
  return score;
}
function overlaps(start,end,blocks) { return blocks.some(b=>start<b.end&&end>b.start); }
function optimizeDay() {
  const tasks=getDayTasks(selectedDate).filter(t=>!t.completed);
  if(!tasks.length){showToast('No tienes tareas pendientes para organizar.');return;}
  const [start,end]=[timeToMinutes(state.settings.dayStart),timeToMinutes(state.settings.dayEnd)];
  if(start===null||end===null||end<=start){showToast('Revisa el horario disponible en Ajustes.');return;}
  const routines=getRoutineEvents(selectedDate);
  const fixedTasks=tasks.filter(t=>t.startTime&&!t.autoScheduled);
  const movable=tasks.filter(t=>!t.startTime||t.autoScheduled).sort((a,b)=>priorityScore(b)-priorityScore(a));
  const blocks=[...routines.map(r=>({start:timeToMinutes(r.startTime),end:timeToMinutes(r.startTime)+r.duration})),...fixedTasks.map(t=>({start:timeToMinutes(t.startTime),end:timeToMinutes(t.startTime)+Number(t.duration)}))];
  const updates=new Map();
  movable.forEach(task=>updates.set(task.id,{...task,startTime:null,autoScheduled:false}));
  let cursor=start;let placed=0;
  for(const task of movable){
    const duration=Number(task.duration)||30;
    let candidate=Math.ceil(cursor/15)*15;
    let found=null;
    while(candidate+duration<=end){
      const conflict=blocks.filter(b=>candidate<b.end&&candidate+duration>b.start).sort((a,b)=>a.end-b.end)[0];
      if(!conflict){found=candidate;break;}
      candidate=Math.ceil(conflict.end/15)*15;
    }
    if(found!==null){updates.set(task.id,{...task,startTime:minutesToTime(found),autoScheduled:true});blocks.push({start:found,end:found+duration});cursor=found+duration+10;placed++;}
  }
  state.tasks=state.tasks.map(t=>updates.get(t.id)||t);persist();renderAll();
  const left=movable.length-placed;
  showToast(left?`${placed} tareas ubicadas; ${left} necesitan otro espacio.`:`¡Listo! Se organizaron ${placed} tareas por prioridad.`);
}
function addRoutine(event) {
  event.preventDefault();const form=new FormData(event.currentTarget);const days=form.getAll('days').map(Number);const title=String(form.get('title')||'').trim();
  if(!title||!days.length){showToast('Escribe el nombre y selecciona al menos un día.');return;}
  state.routines.push({id:uid(),title,startTime:String(form.get('startTime')),duration:Number(form.get('duration')),days});persist();$('#routineDialog').close();event.currentTarget.reset();renderRoutines();renderCalendar();renderToday();showToast('Rutina creada correctamente.');
}
function exportBackup() {
  const payload={application:'Organizador de Tiempo',version:1,exportedAt:new Date().toISOString(),...state};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`respaldo-organiza-${todayISO()}.json`;a.click();URL.revokeObjectURL(url);showToast('Respaldo descargado.');
}
function importBackup(file) {
  if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(!Array.isArray(data.tasks)||!Array.isArray(data.routines)||!data.settings)throw new Error('Formato');state={tasks:data.tasks,routines:data.routines,settings:{theme:'violet',dayStart:'07:00',dayEnd:'21:00',...data.settings}};persist();applyTheme();renderAll();showToast('Respaldo importado correctamente.');}catch{showToast('El archivo no tiene un formato de respaldo válido.');}};reader.readAsText(file);
}
function renderAll(){applyTheme();renderHeader();renderToday();renderCalendar();renderTasks();renderRoutines();$('#dayStart').value=state.settings.dayStart;$('#dayEnd').value=state.settings.dayEnd;}

// Eventos de navegación y pantallas
$$('.nav-item').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.tab)));
$$('[data-tab-link]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();switchTab(el.dataset.tabLink);}));
$('#profileButton').addEventListener('click',()=>switchTab('settings'));
$('#goCalendar').addEventListener('click',()=>switchTab('calendar'));
$('#prevWeek').addEventListener('click',()=>{weekOffset--;const d=parseISO(selectedDate);d.setDate(d.getDate()-7);selectedDate=dateISO(d);renderCalendar();renderToday();});
$('#nextWeek').addEventListener('click',()=>{weekOffset++;const d=parseISO(selectedDate);d.setDate(d.getDate()+7);selectedDate=dateISO(d);renderCalendar();renderToday();});
$('#weekStrip').addEventListener('click',e=>{const day=e.target.closest('[data-date]');if(!day)return;selectedDate=day.dataset.date;renderCalendar();renderToday();});
$('#optimizeBtn').addEventListener('click',optimizeDay);
$('#addTaskFromToday').addEventListener('click',()=>openTaskDialog());
$('#addTaskFromList').addEventListener('click',()=>openTaskDialog());
$('#addTaskCalendar').addEventListener('click',()=>openTaskDialog());
$('#floatingAdd').addEventListener('click',()=>openTaskDialog());
$('#addRoutineButton').addEventListener('click',()=>$('#routineDialog').showModal());
$('#taskForm').addEventListener('submit',saveTask);
$('#routineForm').addEventListener('submit',addRoutine);
$$('[data-close]').forEach(btn=>btn.addEventListener('click',()=>$( `#${btn.dataset.close}`).close()));
$$('.filter-chip').forEach(btn=>btn.addEventListener('click',()=>{taskFilter=btn.dataset.filter;$$('.filter-chip').forEach(b=>b.classList.toggle('active',b===btn));renderTasks();}));
$('#tasksList').addEventListener('click',e=>{const toggle=e.target.closest('[data-toggle-task]');const edit=e.target.closest('[data-edit-task]');const del=e.target.closest('[data-delete-task]');if(toggle)toggleTask(toggle.dataset.toggleTask);if(edit)editTask(edit.dataset.editTask);if(del)deleteTask(del.dataset.deleteTask);});
$('#todayTimeline').addEventListener('click',e=>{const edit=e.target.closest('[data-edit-task]');const del=e.target.closest('[data-delete-task]');if(edit)editTask(edit.dataset.editTask);if(del)deleteTask(del.dataset.deleteTask);});
$('#calendarTimeline').addEventListener('click',e=>{const edit=e.target.closest('[data-edit-task]');const del=e.target.closest('[data-delete-task]');if(edit)editTask(edit.dataset.editTask);if(del)deleteTask(del.dataset.deleteTask);});
$('#routinesList').addEventListener('click',e=>{const del=e.target.closest('[data-delete-routine]');if(!del)return;state.routines=state.routines.filter(r=>r.id!==del.dataset.deleteRoutine);persist();renderAll();showToast('Rutina eliminada.');});
$('#themeGrid').addEventListener('click',e=>{const btn=e.target.closest('[data-theme-choice]');if(!btn)return;state.settings.theme=btn.dataset.themeChoice;persist();applyTheme();});
$('#saveHours').addEventListener('click',()=>{const start=$('#dayStart').value;const end=$('#dayEnd').value;if(!start||!end||timeToMinutes(end)<=timeToMinutes(start)){showToast('La hora final debe ser posterior a la inicial.');return;}state.settings.dayStart=start;state.settings.dayEnd=end;persist();showToast('Horario disponible actualizado.');});
$('#exportData').addEventListener('click',exportBackup);
$('#importDataButton').addEventListener('click',()=>$('#importData').click());
$('#importData').addEventListener('change',e=>importBackup(e.target.files[0]));
$('#installFromSettings').addEventListener('click',async()=>{if(installPrompt){installPrompt.prompt();const result=await installPrompt.userChoice;if(result?.outcome==='accepted')showToast('Instalación iniciada.');installPrompt=null;$('#installBtn').hidden=true;}else showToast('En Chrome, abre ⋮ y elige “Instalar aplicación” o “Añadir a pantalla de inicio”.');});
$('#installBtn').addEventListener('click',()=>$('#installFromSettings').click());

window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;$('#installBtn').hidden=false;});
window.addEventListener('appinstalled',()=>{installPrompt=null;$('#installBtn').hidden=true;showToast('¡Organiza ya está instalada!');});
window.addEventListener('resize',()=>{const active=$('.nav-item.active')?.dataset.tab||'today';$('#floatingAdd').style.display=['today','tasks','calendar'].includes(active)&&window.matchMedia('(min-width: 900px)').matches?'block':'none';});
if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});

renderAll();
