'use strict';

(() => {
  const C=CampaignEngine,E=ExpeditionEngine,A=Artwork,M=MailEngine,F=FlappyEngine;
  const root=document.querySelector('#app'),modal=document.querySelector('#mission-dialog');
  const missions=[
    {name:'Файловый заслон',place:'Технопарк',icon:'shield',color:'#ff755f',goal:'Изолируй 12 программ от незнакомца: они могут выполнять вредные команды.',skill:'Проверяю формат и источник файла'},
    {name:'Мастерская паролей',place:'Лаборатория',icon:'spark',color:'#9563ff',goal:`Собери пароль из ${F.TARGET} символов: один пролёт — один символ.`,skill:'Использую длинные и уникальные пароли'},
    {name:'Совет города',place:'Ратуша',icon:'crown',color:'#ffc442',goal:`Помоги жителям принять ${C.council.length} безопасных решений.`,skill:'Принимаю решения о цифровой гигиене'},
    {name:'Почтовый сортировщик',place:'Почта',icon:'mail',color:'#34c4fa',goal:'Разбери 9 писем: доставить, уточнить или в карантин.',skill:'Замечаю обман в сообщениях'},
    {name:'Личный щит',place:'Парк друзей',icon:'heart',color:'#ff76bb',goal:'Включи 4 щита, отвечая на вопросы. Обходи вирусы.',skill:'Бережно обращаюсь с личными данными'}
  ];
  let session,route='map',current=0,raf=null,lastFrame=0,dialogReturn=null,comicIndex=0,comicMode='intro',comicReadyAt=0,comicReady=false,mapTapReadyAt=0;
  const COMIC_TAP_GAP=350;
  let choiceReadyAt=0;
  function lockFollowup(s){
    choiceReadyAt=performance.now()+450;
    const buttons=[...root.querySelectorAll('[data-do="council-answer"],[data-do="quiz-answer"]')];
    buttons.forEach(b=>b.disabled=true);
    setTimeout(()=>buttons.forEach(b=>{if(b.isConnected&&!s.feedback)b.disabled=false;}),450);
  }
  const sceneCache=new Map();
  function preloadScene(src){
    if(!sceneCache.has(src)){const img=new Image();img.src=src;sceneCache.set(src,img.decode().catch(()=>{}));}
    return sceneCache.get(src);
  }
  const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const button=(act,text,cls='primary',attrs='')=>`<button class="${cls}" data-do="${act}" ${attrs}>${text}</button>`;
  const icon=A.icon;
  function fresh() {pause();session={done:[],files:null,password:null,passwordQuiz:null,fileQuiz:null,mail:null,park:null,council:{index:0,choice:null,feedback:null}};comicIndex=0;comicMode='intro';renderComic();}
  function progress() {
    const percent=session.done.length*20;
    document.querySelector('#progress-value').textContent=`${percent}%`;
    document.querySelector('#territory-count').textContent=`${session.done.length} из 5 районов`;
    const bar=document.querySelector('#liberation');bar.setAttribute('aria-valuenow',percent);bar.style.setProperty('--progress',percent+'%');
  }
  function focusMain(){root.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
  function screen(html){if(route!=='park')MazeGame.destroy();document.body.dataset.screen=route;root.innerHTML=html;progress();focusMain();}
  function top(name){return `<div class="game-top">${button('map','← На карту','ghost')}</div>`;}
  // Coordinates are percentages of the artwork, not of the screen.
  // Each page has two panels; text is real HTML and is never baked into the art.
  const comic=[
    {alt:'Генерал Васисуалий обращается к юным агентам и Пикселю. Ниже Фуфелкрендель запускает свой план.',panels:[
      {speaker:'Генерал Васисуалий',text:'Агенты! Фуфелкрендель атаковал Киберград. Остановим его!',x:4,y:1,width:92},
      {text:'Суперзлодей Фуфелкрендель хочет захватить город и украсть чужие секреты.',x:4,y:53,width:92}
    ]},
    {alt:'В Лаборатории остановлен конвейер паролей. В Технопарке сломан защитный щит файлов.',panels:[
      {text:'Мастерская паролей сломана! Конвейеры в Лаборатории остановились.',x:4,y:3,width:92},
      {text:'В Технопарке взломан файловый заслон. Подозрительные файлы идут в город!',x:4,y:53,width:92}
    ]},
    {alt:'Голограмма ИИ Совета города даёт сбой. На почте остановилась доставка писем.',panels:[
      {text:'Фуфелкрендель запутал ИИ Совета города. Теперь он даёт опасные советы!',x:4,y:3,width:92},
      {text:'Почта захвачена! Вместо обычных писем жители получают сообщения с ловушками.',x:4,y:53,width:92}
    ]},
    {alt:'В Парке друзей мерцают голографические деревья без лиц. Генерал Васисуалий, агенты и Пиксель готовы помочь городу.',panels:[
      {text:'В Парке друзей погасли системы защиты. Даже деревья-голограммы мерцают!',x:4,y:3,width:92},
      {text:'За работу, Агенты! Освободим пять районов и защитим Киберград!',x:4,y:51,width:92}
    ]}
  ];
  const endingComic=[
    {alt:'Агенты и Пиксель отключают сеть Фуфелкренделя. Злодей теряет управление, а вредоносные программы оказываются в карантине.',panels:[
      {text:'Все районы защищены! Пиксель отключает сеть злодея.',x:4,y:2,width:92},
      {text:'Вирусы в карантине. Фуфелкрендель больше не управляет городом!',x:4,y:50.5,width:92}
    ]},
    {alt:'Лаборатория и Технопарк восстановлены. ИИ Совета города снова работает, почта доставляет проверенные письма.',panels:[
      {text:'Лаборатория и Технопарк снова работают. Пароли собраны, файлы под защитой.',x:4,y:3,width:92},
      {text:'Совет помогает жителям, а почта доставляет настоящие сообщения.',x:4,y:53,width:92}
    ]},
    {alt:'В Парке друзей сияют голографические деревья без лиц. Генерал Васисуалий поздравляет агентов и Пикселя с победой.',panels:[
      {text:'В Парке друзей включены все системы защиты. Секреты жителей в безопасности!',x:4,y:3,width:92},
      {text:'Вы спасли Киберград, Агенты! Я горжусь вами!',x:4,y:51.5,width:92}
    ]}
  ];
  function renderComic(){
    pause();route='comic';comicReady=false;
    const index=comicIndex,ending=comicMode==='ending',pages=ending?endingComic:comic,images=ending?SceneAssets.ending:SceneAssets.intro,c=pages[index],last=index===pages.length-1;
    screen(`<section class="story-page intro-comic comic-book ${ending?'ending-comic victory-screen':''}" data-slide="${index}" data-comic-mode="${comicMode}"><button class="comic-picture" data-do="comic-advance" data-slide="${index}" data-comic-mode="${comicMode}" aria-label="Страница ${index+1} из ${pages.length}. ${last?(ending?'Вернуться в спасённый город':'Отправиться спасать город'):'Следующая страница'}" aria-describedby="comic-copy comic-instruction"><span class="comic-sheet"><img class="comic-page-art" src="${images[index]}" alt="${c.alt}" fetchpriority="high" draggable="false"/><span class="comic-copy" id="comic-copy">${c.panels.map((p,i)=>`<span class="comic-balloon ${p.speaker?'speech':'narration'}" data-panel="${i}" style="left:${p.x}%;top:${p.y}%;width:${p.width}%"><span>${escape(p.text)}</span></span>${p.speaker?`<span class="comic-person-label">${escape(p.speaker)}</span>`:''}`).join('')}</span></span></button><div class="comic-footer"><span class="comic-dots" aria-label="Страница ${index+1} из ${pages.length}">${pages.map((_,i)=>`<i class="${i===index?'active':''}"></i>`).join('')}</span><p id="comic-instruction">${last?(ending?'Киберград спасён!':'За работу, Агенты!'):'Коснись, чтобы продолжить'}</p>${ending?'<b class="comic-victory-label">100%</b>':''}</div></section>`);
    // Start the map download as soon as the last comic page opens.
    if(last)preloadScene(SceneAssets.map);
    const picture=root.querySelector('.comic-picture'),art=picture.querySelector('img');
    Promise.all([art.decode(),document.fonts.load('18px Pangolin')]).catch(()=>{picture.classList.add('image-unavailable');}).then(()=>{
      if(!picture.isConnected)return;
      if(art.naturalHeight)picture.querySelector('.comic-sheet').style.setProperty('--page-ratio',art.naturalWidth/art.naturalHeight);
      comicReady=true;comicReadyAt=performance.now()+COMIC_TAP_GAP;
      if(index+1<pages.length)preloadScene(images[index+1]);
    });
  }
  function advanceComic(target){
    if(route!=='comic'||modal.open||target.dataset.comicMode!==comicMode||Number(target.dataset.slide)!==comicIndex||!comicReady)return;
    const now=performance.now(),pages=comicMode==='ending'?endingComic:comic;
    // Accidental repeated taps extend the quiet period rather than queueing pages.
    const allowed=now>=comicReadyAt;comicReadyAt=now+COMIC_TAP_GAP;
    if(!allowed)return;
    if(comicIndex===pages.length-1){mapTapReadyAt=now+COMIC_TAP_GAP;renderMap();return;}
    comicIndex++;renderComic();
  }
  function renderVictory(){comicMode='ending';comicIndex=0;renderComic();}
  function renderMap(){
    pause();choiceReadyAt=0;route='map';const won=session.done.length===5;
    preloadScene(SceneAssets.mailRoom);
    screen(`<section class="map-page"><div class="map-layout"><div class="city-world" aria-label="Карта вымышленного Киберграда, пять районов"><div class="city-stage"><img class="city-map-image" src="${SceneAssets.map}" alt="Киберград сверху: лаборатория, технопарк, совет, почта и зелёный Парк друзей, соединённые неоновыми улицами"/>${missions.map((m,i)=>`<button class="city-point point-${i} ${session.done.includes(i)?'freed':''}" data-do="details" data-id="${i}" data-zone="${i}" style="--point:${m.color}" aria-label="${m.name}. ${session.done.includes(i)?'Район освобождён':'Открыть описание задания'}"><span class="pin">${icon(m.icon)}<small>${session.done.includes(i)?'✓':i+1}</small></span><b>${m.name}</b><span class="place">${session.done.includes(i)?'✓ Район освобождён':m.place}</span></button>`).join('')}</div></div></div><div class="story-replay">${button('story','Комикс','ghost')}${won?button('victory','Финал','ghost')+button('restart','Заново ↻','ghost'):''}</div></section>`);
    root.querySelectorAll("[data-zone]").forEach(zone=>zone.setAttribute("data-freed",session.done.includes(Number(zone.dataset.zone))));
  }
  function openDialog(html,label,cls=''){pause();modal.className=cls;dialogReturn=document.activeElement;modal.innerHTML=`${button('close','×','dialog-close','aria-label="Закрыть"')}${html}`;modal.setAttribute('aria-label',label);modal.showModal();}
  function closeDialog(){modal.close();dialogReturn?.focus({preventScroll:true});}
  function details(i){
    if(!missions[i])return;current=i;const m=missions[i];
    openDialog(`<div class="mission-emblem" style="background:${m.color}">${icon(m.icon)}</div><p class="eyebrow">${m.place}</p><h2>${m.name}</h2><p>${m.goal}</p><div class="reward">${icon('shield')} ${session.done.includes(i)?'Район защищён':'+20% защиты города'}</div>${button('enter',session.done.includes(i)?'Результат':'Играть →')}`,m.name,'mission-details');
  }
  function enter(){closeDialog();pause();if(session.done.includes(current)){result();return;}
    begin();
  }
  function begin(){
    if(current===0){session.files??=C.createFiles();if(session.fileQuiz)renderFileQuiz();else renderFiles();}
    else if(current===1){if(session.passwordQuiz)renderPasswordQuiz();else renderPassword();}
    else if(current===2)renderCouncil();
    else if(current===3){session.mail??=M.create();renderMail();}
    else {session.park??=MazeGame.create();renderPark();}
  }
  function complete(){const first=!session.done.includes(current);if(first){session.done.push(current);NativeBridge.vibrate();}if(first&&session.done.length===5){NativeBridge.complete();renderVictory();}else result();}
  function result(){
    pause();route='result';const m=missions[current];
    screen(`<section class="mini result">${top(m.name)}<div class="result-burst">${icon(m.icon)}<span>✓</span></div><p class="eyebrow">РАЙОН ОСВОБОЖДЁН</p><h1>${m.place} под защитой!</h1><div class="lesson-card"><h2>Запомни</h2><p>${[
      'Проверяй источник и последнее расширение файла. Неизвестные вложения не открывай — попроси взрослого проверить.',
      'Каждому аккаунту — свой длинный случайный пароль и дополнительная проверка входа.',
      'Не отключай защиту, проверяй разрешения, обновляй приложения и делай перерывы.',
      'Не отправляй пароли и коды. Необычную просьбу друга проверь звонком.',
      'Не публикуй адрес, документы и коды. Если уже поделился — попроси взрослого помочь.'
    ][current]}</p></div>${button('map',session.done.length===5?'Посмотреть спасённый город →':'Вернуться на карту →')}${button('replay','Повторить задание','ghost')}</section>`);
  }
  function turret(){return `<g transform="translate(230 260)" aria-label="Защитная кибертурель"><circle r="48" fill="#103d37" stroke="#65f399" stroke-width="2"/><g id="turret-aim"><image id="turret-sprite" href="${SceneAssets.turret}" x="-58" y="-58" width="116" height="116"/><path d="M-5-57L0-65 5-57" fill="none" stroke="#c9ffe0" stroke-width="3" stroke-linecap="round"/></g></g>`;}
  function lessonArt(src,alt,cls=''){return `<div class="lesson-art ${cls}"><img src="${escape(src)}" alt="${escape(alt)}" draggable="false"/></div>`;}
  function renderFiles(){
    route='files';const s=session.files;
    const path=E.zumaPath.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    screen(`<section class="mini files-game">${top(missions[0].name)}<div class="mini-heading"><h1>Лови опасные вложения!</h1></div><div class="format-brief"><div><b>ЛОВИ</b><div class="format-list risk-formats">${C.formats.filter(f=>f.risk).map(f=>`<span>${f.ext}</span>`).join('')}</div></div><div><b>ПРОПУСКАЙ</b><div class="format-list safe-formats">${C.formats.filter(f=>!f.risk).map(f=>`<span>${f.ext}</span>`).join('')}</div></div></div><div class="file-score"><span>В карантине <b id="file-count"></b></span></div><div class="arena-wrap"><svg id="file-arena" viewBox="0 0 480 500" tabindex="0" role="group" aria-label="Поле файлового заслона. Нажми на опасный формат; стрелки меняют прицел, пробел стреляет."><defs><radialGradient id="arena-glow"><stop stop-color="#24735c"/><stop offset="1" stop-color="#102e3e"/></radialGradient><radialGradient id="ball-shine" cx=".3" cy=".2"><stop stop-color="white" stop-opacity=".55"/><stop offset=".6" stop-color="white" stop-opacity="0"/><stop offset="1" stop-color="#052e32" stop-opacity=".25"/></radialGradient></defs><rect width="480" height="500" rx="24" fill="url(#arena-glow)"/><path d="M20 100V35H100M380 35H455V110M455 390V465H380M100 465H25V400" fill="none" stroke="#54c485" stroke-opacity=".2" stroke-width="3"/><path d="${path}" fill="none" stroke="#0e344e" stroke-width="42" stroke-linecap="round"/><path d="${path}" fill="none" stroke="#2d7366" stroke-width="34" stroke-linecap="round"/><path d="${path}" fill="none" stroke="#94f8b8" stroke-opacity=".45" stroke-width="2" stroke-dasharray="3 10"/><text x="16" y="28" fill="#b0e8f1" font-size="11" font-weight="bold">ВХОДЯЩИЕ ФАЙЛЫ →</text><g transform="translate(225 320)"><rect x="-20" y="-15" width="40" height="40" rx="8" fill="#c1f4ff"/><path d="M-12-4h24M-12 4h24M-12 12h24" stroke="#287b9f" stroke-width="3"/><text y="40" text-anchor="middle" font-size="10" fill="#d4f6ff">СЕРВЕР</text></g><g id="file-aim"></g><g id="file-balls"></g>${turret()}<g id="file-shot"></g><g id="file-effects"></g></svg><div id="file-overlay" class="arena-overlay"></div></div><div class="file-controls">${button('fire','Выстрел ↗')}${button('pause','Ⅱ','secondary','id="pause-files" aria-label="Пауза или продолжение"')}</div></section>`);
    const board=root.querySelector('#file-arena');let pointer=null;
    const coords=e=>{const p=board.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(board.getScreenCTM().inverse());};
    board.addEventListener('pointermove',e=>{if(s.status==='running'&&(e.pointerType!=='touch'||pointer===e.pointerId)){const p=coords(e);s.aim={x:p.x,y:p.y};}});
    board.addEventListener('pointerdown',e=>{if(s.status!=='running'||!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0))return;pointer=e.pointerId;board.setPointerCapture(pointer);});
    board.addEventListener('pointerup',e=>{if(pointer!==e.pointerId)return;pointer=null;if(board.hasPointerCapture(e.pointerId))board.releasePointerCapture(e.pointerId);const p=coords(e);C.shoot(s,p.x,p.y);updateFiles();board.focus({preventScroll:true});});
    board.addEventListener('pointercancel',()=>pointer=null);updateFiles();
  }
  function updateFiles(){
    if(route!=='files')return;const s=session.files;
    root.querySelector('#file-count').textContent=`${s.cleared} / ${s.total}`;
    root.querySelector('#file-balls').innerHTML=C.positions(s).map(b=>{const f=C.formats[b.type];return `<g transform="translate(${b.x} ${b.y})"><circle r="20" fill="${f.color}" stroke="${f.ink}" stroke-width="2"/><circle r="19" fill="url(#ball-shine)"/><text text-anchor="middle" y="4" font-size="12" font-weight="900" fill="${f.ink}">${f.ext}</text></g>`;}).join('');
    root.querySelector('#file-aim').innerHTML=s.status==='running'?`<path d="M230 260L${s.aim.x} ${s.aim.y}" stroke="white" stroke-width="2" stroke-dasharray="5 7" opacity=".65"/><circle cx="${s.aim.x}" cy="${s.aim.y}" r="20" fill="none" stroke="white" stroke-width="2"/>`:'';
    root.querySelector('#turret-aim').setAttribute('transform',`rotate(${Math.atan2(s.aim.y-260,s.aim.x-230)*180/Math.PI+90})`);
    root.querySelector('#file-shot').innerHTML=s.projectile?`<circle cx="${s.projectile.x}" cy="${s.projectile.y}" r="8" fill="white" stroke="#5effc3" stroke-width="3"/>`:'';
    root.querySelector('#file-effects').innerHTML=s.effects.map(e=>`<circle cx="${e.x}" cy="${e.y}" r="${18+(1-e.life/.55)*15}" fill="none" stroke="#a6ffe2" stroke-width="3" opacity="${e.life/.55}"/>`).join('');
    const overlay=root.querySelector('#file-overlay');overlay.hidden=s.status==='running';
    const copy={ready:['Турель готова!','Не пропусти подозрительные файлы к серверу.','Начать','pause'],paused:['Пауза','','Продолжить','pause'],lost:['Попробуем ещё раз?','Подозрительный файл добрался до сервера.','Повторить','files-retry'],won:['Отличная защита!','Все 12 файлов в карантине.','Дальше →','files-lesson']}[s.status];
    if(copy)overlay.innerHTML=`<div>${icon(s.status==='won'?'shield':'spark')}<h2>${copy[0]}</h2>${copy[1]?`<p>${copy[1]}</p>`:''}${button(copy[3],copy[2])}</div>`;
    root.querySelector('#pause-files').textContent=s.status==='running'?'Ⅱ':'▶';root.querySelector('#pause-files').disabled=['won','lost'].includes(s.status);
    root.querySelector('[data-do="fire"]').disabled=s.status!=='running'||!!s.projectile;
  }
  function pause(){MazeGame.pause();cancelAnimationFrame(raf);raf=null;if(session?.password){F.pause(session.password);if(route==='password')updateFlight();}if(session?.files?.status==='running'){session.files.status='paused';if(route==='files')updateFiles();}}
  function toggle(){const s=session.files;if(s.status==='running'){pause();return;}if(!['ready','paused'].includes(s.status))return;s.status='running';updateFiles();lastFrame=performance.now();raf=requestAnimationFrame(frame);root.querySelector('#file-arena').focus({preventScroll:true});}
  function frame(now){raf=null;if(route!=='files'||session.files.status!=='running')return;if(document.hidden||modal.open){pause();return;}C.stepFiles(session.files,Math.min((now-lastFrame)/1000,.05));lastFrame=now;updateFiles();if(session.files.status==='running')raf=requestAnimationFrame(frame);}
  function renderFileQuiz(){renderKnowledge('file');}
  function renderPasswordQuiz(){renderKnowledge('password');}
  function renderKnowledge(kind){
    pause();route=kind+'-quiz';const isFile=kind==='file',key=isFile?'fileQuiz':'passwordQuiz',questions=isFile?C.fileQuestions:C.passwordQuestions;
    session[key]??={index:0,choice:null,feedback:false};
    const s=session[key],q=questions[s.index],label=isFile?(q.filename?'photo.jpg<strong>.exe</strong>':s.index===0?'bonus<strong>.exe</strong>':'picture<strong>.png</strong>'):(s.index===0?'Свой пароль':'Второй замок');
    screen(`<section class="mini council-game file-quiz ${isFile?'':'password-quiz'}">${top(missions[isFile?0:1].name)}<div class="mini-heading"><h1>${isFile?'Проверь файловый щит':'Укрепи свой пароль'}</h1><p>${s.index+1} / ${questions.length}</p></div><article class="decision-card"><div class="file-quiz-art">${icon('shield')}<span>${label}</span></div><div class="decision-story"><p>${q.text}</p></div></article><div class="decision-options">${q.options.map((t,i)=>button(kind+'-answer',escape(t),'answer',`data-choice="${i}" ${s.feedback?'disabled':''}`)).join('')}</div>${s.feedback?`<div class="feedback ${s.choice===q.answer?'good':'retry'}" role="status"><b>${s.choice===q.answer?'Верно!':'Попробуй ещё'}</b><p>${escape(q.why)}</p>${button(s.choice===q.answer?(isFile?'file-next':'password-quiz-next'):kind+'-retry-answer',s.choice===q.answer?(s.index===questions.length-1?'Район защищён →':'Дальше →'):'Ещё раз')}</div>`:''}</section>`);
  }
  function knowledgeAnswer(kind,choice){const key=kind==='file'?'fileQuiz':'passwordQuiz',questions=kind==='file'?C.fileQuestions:C.passwordQuestions;if(route===kind+'-quiz'&&C.answerQuestion(questions[session[key].index],session[key],choice))renderKnowledge(kind);}
  function knowledgeRetry(kind){if(route!==kind+'-quiz')return;const s=session[kind==='file'?'fileQuiz':'passwordQuiz'];s.choice=null;s.feedback=false;renderKnowledge(kind);}
  function knowledgeNext(kind){const s=session[kind==='file'?'fileQuiz':'passwordQuiz'],questions=kind==='file'?C.fileQuestions:C.passwordQuestions;if(route!==kind+'-quiz'||!s.feedback||s.choice!==questions[s.index].answer)return;if(s.index===questions.length-1)complete();else{s.index++;s.choice=null;s.feedback=false;renderKnowledge(kind);}}
  function renderPassword(){
    route='password';session.password??=F.create();
    screen(`<section class="mini flappy-game">${top(missions[1].name)}<div class="mini-heading"><h1>Пароль на лету</h1></div><div class="flight-password"><div><span>Учебный пароль</span><b id="flight-count"></b></div><output id="flight-secret" aria-label="Собранные символы"></output><div class="flight-power"><i id="flight-power"></i></div></div><div class="flight-arena"><svg class="flight-background" viewBox="0 0 360 480" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="flight-sky" x2="0" y2="1"><stop stop-color="#071e30"/><stop offset="1" stop-color="#124a4a"/></linearGradient></defs><rect width="360" height="480" fill="url(#flight-sky)"/><g stroke="#5bdfb7" stroke-opacity=".12" fill="none"><path d="M0 80H360M0 160H360M0 240H360M0 320H360M0 400H360M60 0V480M140 0V480M220 0V480M300 0V480"/><path d="M0 460V380H30V350H70V400H110V370H150V430H200V380H240V340H290V390H330V360H360" stroke-width="3"/></g></svg><svg id="flight-board" viewBox="0 0 360 480" tabindex="0" role="group" aria-label="Полёт Пикселя. Касайся поля или нажимай пробел, чтобы взлететь. Пролетай между трубами."><defs><linearGradient id="flight-pipe"><stop stop-color="#164a40"/><stop offset=".5" stop-color="#28785b"/><stop offset="1" stop-color="#123b3a"/></linearGradient></defs><g id="flight-gates"></g><g id="flight-byte"><path d="M-17 12l-12 6 14 2M-12 19l-6 11 12-9" fill="#69e8ff" opacity=".75"/><rect x="-21" y="-16" width="42" height="33" rx="12" fill="#b3f7db" stroke="#41c9a5" stroke-width="2"/><rect x="-15" y="-10" width="30" height="20" rx="7" fill="#092e3d"/><path d="M-10-1q3-6 6 0M4-1q3-6 6 0M-4 5q4 4 8 0" fill="none" stroke="#76ffd4" stroke-width="2" stroke-linecap="round"/><path d="M0-16v-8" stroke="#b4ffe8" stroke-width="3"/><circle cy="-26" r="5" fill="#ffe075"/><path d="M-20 1h-5v9h5M21 1h4v9h-4" fill="#69d4c6"/></g><text id="flight-earned" x="180" y="55" text-anchor="middle" fill="#adffc1" font-size="25" font-weight="bold"></text></svg><div id="flight-overlay" class="arena-overlay"></div></div><div class="flight-controls">${button('flap','Взлететь ↑')}${button('flight-pause','Ⅱ','secondary','aria-label="Пауза полёта"')}</div><p class="flight-note">Учебный пароль — не для настоящего аккаунта.</p></section>`);
    const board=root.querySelector('#flight-board');
    board.addEventListener('pointerdown',e=>{if(!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0)||session.password.status!=='running')return;e.preventDefault();flap();board.focus({preventScroll:true});});
    updateFlight();
  }
  function updateFlight(){
    if(route!=='password')return;const s=session.password;
    root.querySelector('#flight-count').textContent=`${s.password.length} / ${F.TARGET}`;
    root.querySelector('#flight-secret').textContent=s.password||'·'.repeat(F.TARGET);
    root.querySelector('#flight-power').style.width=`${s.password.length/F.TARGET*100}%`;
    root.querySelector('#flight-gates').innerHTML=s.gates.map(g=>{const upper=g.center-F.GAP/2,lower=g.center+F.GAP/2;return `<g transform="translate(${g.x} 0)"><rect width="52" height="${upper}" fill="url(#flight-pipe)" stroke="#69dd9f" stroke-width="2"/><rect x="-5" y="${upper-15}" width="62" height="15" rx="4" fill="#297d60" stroke="#8ef2b2" stroke-width="2"/><rect y="${lower}" width="52" height="${F.HEIGHT-lower}" fill="url(#flight-pipe)" stroke="#69dd9f" stroke-width="2"/><rect x="-5" y="${lower}" width="62" height="15" rx="4" fill="#297d60" stroke="#8ef2b2" stroke-width="2"/><text x="26" y="${g.center+5}" text-anchor="middle" fill="#acfbd2" font-size="18" opacity=".8">+1</text></g>`;}).join('');
    root.querySelector('#flight-byte').setAttribute('transform',`translate(${F.X} ${s.y}) rotate(${Math.max(-18,Math.min(30,s.vy/12))})`);
    root.querySelector('#flight-earned').textContent=s.flash>0&&s.password&&['running','won'].includes(s.status)?`+ ${s.password.slice(-1)}`:'';
    const overlay=root.querySelector('#flight-overlay');overlay.hidden=s.status==='running';
    // Do not rebuild a focused overlay button every animation frame.
    if(overlay.dataset.status!==s.status){overlay.dataset.status=s.status;const copy={ready:[`Собери ${F.TARGET} символов`,'Касание — вверх. Пролёт — +1 символ.','Полетели!','flight-start'],paused:['Пауза','','Продолжить','flight-start'],bumped:['Попробуй ещё!','Символы сохранены.','Летим дальше','flight-start'],won:[`${F.TARGET} символов собрано!`,'Длинный случайный пароль сложнее угадать.','Дальше →','flight-complete']}[s.status];overlay.innerHTML=copy?`<div><h2>${copy[0]}</h2>${copy[1]?`<p>${copy[1]}</p>`:''}${button(copy[3],copy[2])}</div>`:'';}
    root.querySelector('[data-do="flap"]').disabled=s.status!=='running';root.querySelector('[data-do="flight-pause"]').disabled=s.status!=='running';
  }
  function startFlight(){if(route!=='password'||!F.flap(session.password))return;cancelAnimationFrame(raf);updateFlight();lastFrame=performance.now();raf=requestAnimationFrame(flightFrame);root.querySelector('#flight-board').focus({preventScroll:true});}
  function flap(){if(route==='password'&&session.password.status==='running'){F.flap(session.password);updateFlight();}}
  function flightFrame(now){raf=null;if(route!=='password'||session.password.status!=='running')return;if(document.hidden||modal.open){pause();return;}F.step(session.password,Math.min((now-lastFrame)/1000,.05));lastFrame=now;updateFlight();if(session.password.status==='running')raf=requestAnimationFrame(flightFrame);}
  function councilArt(index,branch){
    const art=C.council[index].art,[kind,num]=art.split('-');
    if(kind==='council')return SceneAssets.council[Number(num)];
    if(kind==='mail')return Number(num)===0&&branch?SceneAssets.mailWarning:SceneAssets.mail[Number(num)];
    if(kind==='password')return SceneAssets.passwordQuestions[Number(num)];
    return SceneAssets.turret;
  }
  function renderCouncil(){
    route='council';const s=session.council,q=C.activeQuestion(C.council[s.index],s);
    screen(`<section class="mini council-game" data-branch="${!!s.branch}">${top(missions[2].name)}<div class="mini-heading"><h1>${s.branch?'Что было дальше?':'Совет города'}</h1><p class="decision-count">${s.index+1} / ${C.council.length}</p></div><article class="decision-card" tabindex="0" aria-label="Карточка решения. Свайп влево или вправо выбирает вариант."><div class="decision-illustration">${lessonArt(councilArt(s.index,s.branch),q.title)}</div><div class="decision-story"><p>${q.text}</p></div><span class="swipe-preview" aria-hidden="true"></span></article><div class="decision-options">${q.options.map((t,i)=>button('council-answer',`${i===0?'← ':''}${t}${i===1?' →':''}`,'answer',`data-choice="${i}" ${s.feedback?'disabled':''}`)).join('')}</div>${s.feedback?`<div class="feedback ${s.choice===q.answer?'good':'retry'}" role="status"><b>${s.choice===q.answer?'Верно!':'Попробуй ещё'}</b><p>${s.branch&&q.outcomes?escape(q.outcomes[s.choice])+' ':''}${q.why}</p>${button(s.choice===q.answer?'council-next':'try-answer',s.choice===q.answer?'Дальше →':'Ещё раз')}</div>`:''}</section>`);
    const card=root.querySelector('.decision-card');let drag=null;
    card.addEventListener('pointerdown',e=>{if(s.feedback||!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0))return;drag={x:e.clientX,y:e.clientY,id:e.pointerId};card.setPointerCapture(e.pointerId);});
    card.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x;card.style.transform=`translateX(${Math.max(-65,Math.min(65,dx))}px) rotate(${dx/30}deg)`;card.querySelector('.swipe-preview').textContent=Math.abs(dx)>30?q.options[dx<0?0:1]:'';});
    const reset=()=>{drag=null;card.style.transform='';card.querySelector('.swipe-preview').textContent='';};
    card.addEventListener('pointerup',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(card.hasPointerCapture(e.pointerId))card.releasePointerCapture(e.pointerId);reset();if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy))setTimeout(()=>{if(route==='council'&&session.council===s&&!s.feedback)councilAnswer(dx<0?0:1);},0);});
    card.addEventListener('pointercancel',reset);
    card.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();councilAnswer(e.key==='ArrowLeft'?0:1);}});
  }
  function councilAnswer(choice){const s=session.council;if(s.feedback||performance.now()<choiceReadyAt)return;const branched=s.branch;C.answerQuestion(C.council[s.index],s,choice);renderCouncil();if(!branched&&s.branch)lockFollowup(s);root.querySelector('.feedback')?.scrollIntoView({block:'nearest'});}
  function renderMail(){
    route='mail';const s=session.mail,m=M.current(s);
    screen(`<section class="mini mail-game">${top(missions[3].name)}<div class="mini-heading"><h1>Разбери почту</h1></div><div class="sorting-progress" aria-label="Писем разобрано">${Array.from({length:9},(_,i)=>`<i class="${i<s.sorted?'sorted':''}"></i>`).join('')}<b>${s.sorted} / 9</b></div><div class="mail-belt" style="--mail-art:url('${SceneAssets.mailRoom}')"><article class="mail-letter ${s.status==='sorted'?'sent':''}" tabindex="0" aria-label="Письмо. Перетащи в лоток или выбери лоток ниже."><div class="letter-sender">${icon('mail')}<span>${escape(m.sender)}</span></div><h2>${escape(m.subject)}</h2><p class="letter-body">${escape(m.body)}</p>${s.status==='sorted'?button('mail-next',s.sorted===9?'Почта защищена →':'Следующее письмо →','primary mail-next'):`<p class="letter-context">${escape(m.context)}</p>`}</article></div><div class="mail-bins">${M.bins.map((b,i)=>button('mail-sort',`${icon(['mail','spark','shield'][i])}<span>${escape(b.label)}</span>`,'mail-bin '+b.id,`data-bin="${b.id}" ${s.status!=='playing'?'disabled':''}`)).join('')}</div><div class="sorting-feedback ${s.feedback?(s.feedback.correct?'good':'retry'):''}" role="status">${s.feedback?escape(s.feedback.text):''}</div></section>`);
    const card=root.querySelector('.mail-letter');let drag=null;
    card.addEventListener('pointerdown',e=>{if(s.status!=='playing'||!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0))return;drag={x:e.clientX,y:e.clientY,id:e.pointerId};card.setPointerCapture(e.pointerId);});
    card.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)<6)return;card.classList.add('dragging');card.style.transform=`translate(${dx}px,${dy}px) rotate(${Math.max(-9,Math.min(9,dx/25))}deg)`;card.style.pointerEvents='none';root.querySelectorAll('.mail-bin').forEach(b=>b.classList.toggle('target',b===document.elementFromPoint(e.clientX,e.clientY)?.closest('.mail-bin')));});
    const reset=()=>{drag=null;card.classList.remove('dragging');card.style.transform='';card.style.pointerEvents='';root.querySelectorAll('.mail-bin').forEach(b=>b.classList.remove('target'));};
    card.addEventListener('pointerup',e=>{if(!drag)return;const moved=Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>10,bin=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-bin]');if(card.hasPointerCapture(e.pointerId))card.releasePointerCapture(e.pointerId);reset();if(moved&&bin)sortMail(bin.dataset.bin);});
    card.addEventListener('pointercancel',reset);
    card.addEventListener('keydown',e=>{if(['1','2','3'].includes(e.key)){e.preventDefault();sortMail(M.bins[Number(e.key)-1].id);}});

  }
  function sortMail(bin){if(route!=='mail'||session.mail.status!=='playing')return;M.sort(session.mail,bin);renderMail();}
  function renderPark(){route='park';MazeGame.mount({state:session.park,questions:C.parkQuestions,screen,top,button,icon,onComplete:complete});}
  function menu(){
    openDialog(`<h2>Меню</h2>${button('close','Продолжить')}${route!=='map'?button('menu-map','На карту','secondary'):''}${session.done.length===5?button('share-result','Поделиться победой','secondary'):''}${button('exit-game','Закрыть игру','ghost')}`,'Меню');
  }
  function replay(){
    if(current===0){session.files=C.createFiles();session.fileQuiz=null;renderFiles();}
    else if(current===1){session.password=F.create();session.passwordQuiz=null;renderPassword();}
    else if(current===2){session.council={index:0,choice:null,feedback:null};renderCouncil();}
    else if(current===3){session.mail=M.create();renderMail();}
    else{session.park=MazeGame.create();renderPark();}
  }
  // Some mobile WebViews suppress the first compatibility click after a swipe.
  // Activate a deliberate touch tap once; mouse and keyboard keep native clicks.
  let touchButton=null,ignoreNativeClickUntil=0;
  document.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='touch'||!e.isPrimary)return;
    const b=e.target.closest('button[data-do]');
    touchButton=b&&!b.disabled?{button:b,id:e.pointerId,x:e.clientX,y:e.clientY}:null;
  });
  document.addEventListener('pointercancel',()=>{touchButton=null;});
  document.addEventListener('pointerup',e=>{
    const t=touchButton;touchButton=null;
    if(!t||e.pointerType!=='touch'||e.pointerId!==t.id||Math.hypot(e.clientX-t.x,e.clientY-t.y)>12||e.target.closest('button[data-do]')!==t.button)return;
    ignoreNativeClickUntil=performance.now()+600;
    setTimeout(()=>{if(t.button.isConnected&&!t.button.disabled)t.button.click();},0);
  });
  document.addEventListener('click',e=>{
    if(e.isTrusted&&e.detail>0&&performance.now()<ignoreNativeClickUntil){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  document.addEventListener('click',e=>{
    const target=e.target.closest('[data-do]');if(!target||target.disabled)return;const act=target.dataset.do,choice=Number(target.dataset.choice);
    switch(act){
      case 'map':renderMap();break;
      case 'share-result':if(session.done.length===5)NativeBridge.share();break;
      case 'exit-game':pause();NativeBridge.close();break;
      case 'details':if(performance.now()>=mapTapReadyAt)details(Number(target.dataset.id));break;
      case 'enter':enter();break;
      case 'comic-advance':advanceComic(target);break;
      case 'story':comicMode='intro';comicIndex=0;renderComic();break;
      case 'victory':if(session.done.length===5)renderVictory();break;
      case 'close':closeDialog();break;
      case 'menu':menu();break;
      case 'menu-map':closeDialog();renderMap();break;
      case 'restart':openDialog(`<h2>Начать заново?</h2><p>Все освобождённые районы и текущие задания обнулятся.</p>${button('confirm-restart','Начать новую сессию')}${button('close','Остаться в городе','secondary')}`,'Новая сессия');break;
      case 'confirm-restart':closeDialog();fresh();break;
      case 'replay':replay();break;
      case 'pause':toggle();break;
      case 'fire':C.shoot(session.files);updateFiles();break;
      case 'files-retry':session.files=C.createFiles();renderFiles();break;
      case 'files-lesson':if(route==='files'&&session.files.status==='won')renderFileQuiz();break;
      case 'file-answer':knowledgeAnswer('file',choice);break;
      case 'file-retry-answer':knowledgeRetry('file');break;
      case 'file-next':knowledgeNext('file');break;
      case 'password-answer':knowledgeAnswer('password',choice);break;
      case 'password-retry-answer':knowledgeRetry('password');break;
      case 'password-quiz-next':knowledgeNext('password');break;
      case 'flight-start':startFlight();break;
      case 'flap':flap();break;
      case 'flight-pause':pause();break;
      case 'flight-complete':if(route==='password'&&session.password.status==='won')renderPasswordQuiz();break;
      case 'council-answer':councilAnswer(choice);break;
      case 'council-next':if(session.council.index===C.council.length-1)complete();else{session.council.index++;session.council.feedback=null;session.council.choice=null;session.council.branch=false;renderCouncil();}break;
      case 'try-answer':if(route==='council'){session.council.choice=null;session.council.feedback=null;renderCouncil();}break;
      case 'mail-sort':sortMail(target.dataset.bin);break;
      case 'mail-next':if(M.next(session.mail)){if(session.mail.status==='complete')complete();else renderMail();}break;

    }
  });
  document.addEventListener('keydown',e=>{
    if(route==='comic'&&!modal.open&&['Enter','Space'].includes(e.code)){
      e.preventDefault();
      if(!e.repeat)advanceComic(root.querySelector('.comic-picture'));
      return;
    }
    if(route==='password'&&!modal.open&&['Space','ArrowUp'].includes(e.code)&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&e.target.tagName!=='BUTTON'){e.preventDefault();if(!e.repeat)flap();return;}
    if(route!=='files'||modal.open||e.ctrlKey||e.altKey||e.metaKey)return;
    if(e.code==='KeyP'){e.preventDefault();if(!e.repeat)toggle();}
    if(e.code==='Space'&&e.target.tagName!=='BUTTON'){e.preventDefault();if(!e.repeat){C.shoot(session.files);updateFiles();}}
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
      e.preventDefault();const s=session.files,a=Math.atan2(s.aim.y-260,s.aim.x-230)+(['ArrowLeft','ArrowUp'].includes(e.key)?-.1:.1);s.aim={x:230+Math.cos(a)*200,y:260+Math.sin(a)*200};updateFiles();
    }
  });
  modal.addEventListener('click',e=>{if(e.target===modal){const b=modal.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)closeDialog();}});
  window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  fresh();
})();
