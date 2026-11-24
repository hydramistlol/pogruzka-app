/* ==========================================================
   ЧАСТЬ 3. ДАННЫЕ И НАСТРОЙКИ (список категорий и людей)
   ========================================================== */

// Категории и люди в них. Чтобы добавить человека или категорию, правь только этот список.
var CATS=[
 {id:"car",name:"Машина",people:["Слава","Антон","Артём","Серёга"]},
 {id:"shovel",name:"Лопата",people:["Слава","Антон","Артём"]},
 {id:"kamaz",name:"Камаз",people:["Слава","Антон","Артём"]},
 {id:"truck",name:"Фура",people:["Слава","Антон","Артём"]}
];
// Имена ячеек в памяти браузера: KEY хранит выбор, GK хранит настройки GitHub
var KEY="pogruzka_v2",GK="pogruzka_gh",sha=null;


/* ==========================================================
   ЧАСТЬ 4. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (мелкие помощники)
   ========================================================== */

function $(i){return document.getElementById(i)}                 // короткая запись: найти элемент по id
function copy(o){return JSON.parse(JSON.stringify(o))}           // сделать независимую копию данных
function msg(t){$("msg").textContent=t}                          // показать сообщение под списком
function load(k){try{return JSON.parse(localStorage.getItem(k)||"{}")}catch(e){return {}}}  // прочитать из памяти браузера
function put(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}                // записать в память браузера

// saved = то, что уже сохранено; draft = текущий выбор на экране (ещё не сохранён); cfg = настройки GitHub
var saved=load(KEY),draft=copy(saved),cfg=load(GK);

// Дата: добавить ноль, сегодняшняя дата, красивый вывод «21 нояб. 2026 г.»
function pad(n){return n<10?"0"+n:""+n}
function todayIso(){var t=new Date();return t.getFullYear()+"-"+pad(t.getMonth()+1)+"-"+pad(t.getDate())}
function fmt(iso){if(!iso)return "";var p=iso.split("-");return new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString("ru-RU",{day:"numeric",month:"short",year:"numeric"})}

// Кто следующий по кругу после выбранного человека
function nextOf(c,n){var i=c.people.indexOf(n);return i<0?"—":c.people[(i+1)%c.people.length]}
// Есть ли несохранённые изменения (тогда кнопка «Сохранить» активна)
function dirty(){return JSON.stringify(draft)!==JSON.stringify(saved)}
// Оставляет в данных только нужное (имя и дату), защита от мусора в файле
function clean(o){var r={};CATS.forEach(function(c){var d=o&&o[c.id];if(d&&d.name)r[c.id]={name:d.name,iso:d.iso||""}});return r}


/* ==========================================================
   ЧАСТЬ 5. ГЛАВНЫЙ ЭКРАН (табло с категориями)
   ========================================================== */

// Иконки категорий (рисунки в формате SVG). Лопата: машина с опущенным задним бортом.
var ICONS={
 car:'<svg viewBox="0 0 24 24"><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3v-5l2-5h10l4 5h2v5h-2M9 17h6M3 12h18M12 7v5"/></svg>',
 shovel:'<svg viewBox="0 0 24 24"><rect x="6" y="5" width="10" height="9" rx="1"/><path d="M16 8h3.5l2.5 3v3h-6"/><circle cx="10" cy="17" r="1.8"/><circle cx="19" cy="17" r="1.8"/><path d="M6 14l-3 3.5H1.5"/></svg>',
 kamaz:'<svg viewBox="0 0 24 24"><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3V6h11v11M9 17h6M14 9h4l3 4v4h-2"/></svg>',
 truck:'<svg viewBox="0 0 24 24"><rect x="1.5" y="5" width="13" height="9" rx="1"/><path d="M14.5 8H18l3 3v3h-6.5"/><circle cx="5" cy="17" r="1.7"/><circle cx="9.5" cy="17" r="1.7"/><circle cx="18.5" cy="17" r="1.7"/></svg>'
};

// Дата словами: сегодня, вчера, 3 дня назад. Если прошло больше недели, обычная дата («14 нояб.»)
function ago(iso){
 if(!iso)return "";
 var p=iso.split("-"),t=new Date(),a=new Date(t.getFullYear(),t.getMonth(),t.getDate()),b=new Date(+p[0],+p[1]-1,+p[2]);
 var n=Math.round((a-b)/86400000);
 if(n===0)return "сегодня";
 if(n===1)return "вчера";
 if(n>=2&&n<=4)return n+" дня назад";
 if(n>=5&&n<=7)return n+" дней назад";
 var o={day:"numeric",month:"short"};if(b.getFullYear()!==a.getFullYear())o.year="numeric";
 return b.toLocaleDateString("ru-RU",o);
}

function render(){
 // Шапка таблицы
 var h='<div class="board"><div class="bh"><span>Категория</span><span>Следующий</span><span>Грузил последним</span></div>';
 // Для каждой категории строка: иконка и название | следующий человек | кто грузил и когда
 CATS.forEach(function(c){
  var d=draft[c.id];
  h+='<button class="row" data-id="'+c.id+'"><span class="cat">'+ICONS[c.id]+c.name+'</span>'+
   (d?'<span class="nx"><span>'+nextOf(c,d.name)+'</span></span><span class="lst"><span class="n">'+d.name+'</span><span class="w">'+ago(d.iso)+'</span></span>'
     :'<span class="nx empty">не выбрано</span><span class="lst empty">—</span>')+'</button>';
 });
 h+='</div>';
 $("list").innerHTML=h;
 $("save").disabled=!dirty();   // «Сохранить» активна, только если есть изменения
 // По нажатию на строку открываем окно выбора
 document.querySelectorAll(".row").forEach(function(b){b.onclick=function(){openSheet(b.getAttribute("data-id"))}});
}


/* ==========================================================
   ЧАСТЬ 6. ОКНО ВЫБОРА (дата и очерёдность людей)
   ========================================================== */

// Закрыть окно; также закрывается нажатием на тёмную область вокруг
function closeSheet(){$("ov").classList.remove("on")}
$("ov").onclick=function(e){if(e.target===this)closeSheet()};

// Открыть окно для категории с номером id
function openSheet(id){
 var c=CATS.filter(function(x){return x.id===id})[0],d0=draft[id]||{},iso=d0.iso||todayIso();
 // Собираем содержимое: заголовок с крестиком, поле даты, список людей, кнопка «Готово»
 var h='<div class="hd"><h2>'+c.name+'</h2><button class="x" id="x" aria-label="Закрыть">✕</button></div><label class="lbl">Дата</label><input type="date" class="dt" id="dt" value="'+iso+'"><label class="lbl">Очерёдность</label>';
 c.people.forEach(function(p){h+='<button class="opt'+(d0.name===p?" sel":"")+'" data-p="'+p+'">'+p+'</button>'});
 h+='<button class="opt done" id="done">Готово</button>';
 var s=$("sheet");s.innerHTML=h;
 // Смена даты: обновляем дату у уже выбранного человека
 $("dt").onchange=function(){if(this.value)iso=this.value;if(draft[id])draft[id].iso=iso;render()};
 // Нажатие на имя: записываем выбор в черновик и подсвечиваем это имя
 s.querySelectorAll(".opt[data-p]").forEach(function(b){b.onclick=function(){
  draft[id]={name:b.getAttribute("data-p"),iso:iso};
  s.querySelectorAll(".opt[data-p]").forEach(function(o){o.classList.toggle("sel",o===b)});
  msg("");render();
 }});
 // «Готово» и крестик закрывают окно; затем показываем окно
 $("done").onclick=closeSheet;$("x").onclick=closeSheet;$("ov").classList.add("on");
}


/* ==========================================================
   ЧАСТЬ 7. СВЯЗЬ С GITHUB (чтение и запись файла с данными)
   ========================================================== */

function ready(){return cfg.repo&&cfg.token}   // настроен ли GitHub (есть репозиторий и токен)
// Адрес файла с данными в репозитории и заголовки запроса (с токеном)
function api(){return "https://api.github.com/repos/"+cfg.repo+"/contents/"+(cfg.path||"data.json")}
function hdr(){return {"Authorization":"Bearer "+cfg.token,"Accept":"application/vnd.github+json"}}
// Перевод текста в формат base64 и обратно (так GitHub хранит содержимое файла)
function b64e(s){return btoa(unescape(encodeURIComponent(s)))}
function b64d(s){return decodeURIComponent(escape(atob(s)))}

// Скачать данные с GitHub. Если файла ещё нет, возвращает пустые данные
async function pull(){
 var r=await fetch(api()+"?t="+Date.now(),{headers:hdr(),cache:"no-store"});
 if(r.status==404){sha=null;return {}}
 if(!r.ok)throw new Error(r.status);
 var j=await r.json();sha=j.sha;
 try{return clean(JSON.parse(b64d(j.content)))}catch(e){return {}}
}
// Записать данные в файл на GitHub
async function push(obj){
 var body={message:"Погрузка машин: обновление",content:b64e(JSON.stringify(obj,null,1))};
 if(sha)body.sha=sha;
 var h=hdr();h["Content-Type"]="application/json";
 var r=await fetch(api(),{method:"PUT",headers:h,body:JSON.stringify(body)});
 if(!r.ok)throw new Error(r.status);
 sha=(await r.json()).content.sha;
}
// Обновить экран данными с GitHub. Если у тебя есть несохранённые правки, они не затираются
async function sync(quiet){
 if(!ready()){if(!quiet)msg("GitHub не настроен: нажми ⚙");return}
 try{
  var rem=await pull();
  if(JSON.stringify(rem)!==JSON.stringify(saved)){
   var wd=dirty();saved=rem;put(KEY,saved);
   if(!wd)draft=copy(saved);render();
  }
  if(!quiet)msg("Обновлено ✓");
 }catch(e){if(!quiet)msg("Нет связи с GitHub (код "+e.message+")")}
}


/* ==========================================================
   ЧАСТЬ 8. КНОПКИ: «Сохранить», ↻ и ⚙
   ========================================================== */

// «Сохранить»: скачиваем свежие данные, меняем только то, что ты поменял, и отправляем на GitHub
$("save").onclick=async function(){
 // Если GitHub не настроен, сохраняем только на этом телефоне
 if(!ready()){saved=copy(draft);put(KEY,saved);render();msg("Сохранено на этом телефоне (GitHub не настроен)");return}
 var changed=CATS.filter(function(c){return JSON.stringify(draft[c.id])!==JSON.stringify(saved[c.id])});
 msg("Сохраняю…");
 try{
  var rem=await pull();
  changed.forEach(function(c){if(draft[c.id])rem[c.id]=draft[c.id];else delete rem[c.id]});
  await push(rem);
  saved=rem;draft=copy(rem);put(KEY,saved);render();msg("Сохранено в GitHub ✓");
 }catch(e){msg("Не удалось сохранить в GitHub (код "+e.message+"). Нажми «Сохранить» ещё раз.")}
};

// ↻ обновить данные вручную
$("ref").onclick=function(){sync(false)};

// ⚙ окно настроек: репозиторий, файл, токен
$("cfg").onclick=function(){
 var h='<div class="hd"><h2>Синхронизация с GitHub</h2><button class="x" id="x2" aria-label="Закрыть">✕</button></div><p class="hint">Данные хранятся в файле в вашем репозитории. Токен остаётся только на этом телефоне.</p>'+
  '<label class="lbl">Репозиторий (владелец/название)</label><input class="dt" id="c1" value="'+(cfg.repo||"")+'" placeholder="ivan/pogruzka-data" autocapitalize="off">'+
  '<label class="lbl">Файл</label><input class="dt" id="c2" value="'+(cfg.path||"data.json")+'" autocapitalize="off">'+
  '<label class="lbl">Токен (Contents: Read and write)</label><input class="dt" id="c3" type="password" value="'+(cfg.token||"")+'" autocapitalize="off">'+
  '<button class="opt done" id="c4">Сохранить настройки</button><button class="opt" id="c5">Отключить GitHub</button>';
 $("sheet").innerHTML=h;
 // «Сохранить настройки»: запоминаем введённое и сразу обновляем данные
 $("c4").onclick=function(){cfg={repo:$("c1").value.trim(),path:$("c2").value.trim()||"data.json",token:$("c3").value.trim()};put(GK,cfg);closeSheet();render();sync(false)};
 // «Отключить GitHub»: стираем настройки на этом устройстве
 $("c5").onclick=function(){cfg={};put(GK,cfg);closeSheet();render();msg("GitHub отключён")};
 $("x2").onclick=closeSheet;
 $("ov").classList.add("on");
};


/* ==========================================================
   ЧАСТЬ 9. ЗАПУСК И АВТООБНОВЛЕНИЕ
   ========================================================== */

// Обновлять данные, когда возвращаешься в приложение, и раз в 30 секунд
// (только если нет несохранённых правок)
document.addEventListener("visibilitychange",function(){if(!document.hidden&&!dirty())sync(true)});
setInterval(function(){if(!document.hidden&&!dirty())sync(true)},30000);

// Первый запуск: рисуем экран и тихо подтягиваем данные с GitHub
render();sync(true);
