'use strict';

const CampaignEngine = (() => {
  const E = ExpeditionEngine;
  const GAP=42;
  const positions=s=>s.balls.map((ball,index)=>({...ball,...E.zumaPoint(s.offset+index*GAP),index}));
  const formats = [
    {ext:'.EXE',color:'#ff735b',ink:'#682312',risk:true,why:'Запускает программу. Незнакомая программа может менять файлы и настройки.'},
    {ext:'.JS',color:'#c297ff',ink:'#352064',risk:true,why:'Файл со сценарием — набором команд. При запуске может выполнять действия на устройстве.'},
    {ext:'.BAT',color:'#ffcf4c',ink:'#613b00',risk:true,why:'Запускает команды Windows. Они могут изменить или удалить файлы.'},
    {ext:'.PNG',color:'#69e8bf',ink:'#124f40',risk:false,why:'Картинка от учителя. В этой игре источник и файл уже проверены.'},
    {ext:'.TXT',color:'#7ae1ff',ink:'#164b63',risk:false,why:'Обычный текст от учителя. В этой игре источник и файл уже проверены.'},
    {ext:'.APK',color:'#ff9d68',ink:'#68320f',risk:true,why:'Устанавливает приложение Android. Файл от незнакомца может установить вредную программу.'},
    {ext:'.CMD',color:'#f5a6ca',ink:'#682746',risk:true,why:'Запускает команды Windows. Незнакомый файл может менять настройки и удалять данные.'},
    {ext:'.VBS',color:'#b9acff',ink:'#3b286b',risk:true,why:'Содержит команды для Windows. При запуске незнакомого сценария устройство может выполнить вредные действия.'},
    {ext:'.JPG',color:'#a1edba',ink:'#195133',risk:false,why:'Фотография от учителя. В этой игре источник и файл уже проверены.'},
    {ext:'.MP3',color:'#a1e5ec',ink:'#15535b',risk:false,why:'Аудиозапись от учителя. В этой игре источник и файл уже проверены.'}
  ];
  function createFiles(random=Math.random) {
    const balls=[];
    const shuffle=items=>{
      for(let i=items.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}
      return items;
    };
    const risky=shuffle([0,1,2,5,6,7,0,1,2,5,6,7]);
    const checked=shuffle([3,4,8,9,3,4]);
    for(let i=0;i<6;i++) {
      balls.push({id:balls.length,type:risky[i*2]},{id:balls.length+1,type:risky[i*2+1]},{id:balls.length+2,type:checked[i]});
    }
    return {balls,offset:65,speed:13,status:'ready',ammo:0,aim:{x:230,y:65},projectile:null,shots:0,cleared:0,total:12,safeHits:0,delivered:0,effects:[],message:'Подозрительные файлы → карантин'};
  }
  function hitTime(ax,ay,bx,by,cx,cy,r=26) {
    const dx=bx-ax,dy=by-ay,len=dx*dx+dy*dy;
    const t=len?Math.max(0,Math.min(1,((cx-ax)*dx+(cy-ay)*dy)/len)):0;
    return Math.hypot(ax+t*dx-cx,ay+t*dy-cy)<=r?t:null;
  }
  function impact(s,index) {
    const ball=s.balls[index];if(!ball||s.status!=='running')return false;
    const type=formats[ball.type];
    if(!type.risk) {
      s.safeHits++;s.message='Проверенный файл — пропусти';return false;
    }
    s.effects.push({...E.zumaPoint(s.offset+index*GAP),life:.55});
    s.balls.splice(index,1);s.cleared++;
    s.message=`${type.ext} → карантин`;
    if(s.cleared===s.total) {s.status='won';s.message='Все опасные файлы в карантине!';}
    return true;
  }
  function stepFiles(s,seconds) {
    if(s.status!=='running'||!Number.isFinite(seconds)||seconds<=0)return;
    let remain=Math.min(.25,seconds);
    while(remain>0&&s.status==='running') {
      const dt=Math.min(remain,1/60);remain-=dt;s.offset+=s.speed*dt;
      s.effects=s.effects.map(e=>({...e,life:e.life-dt})).filter(e=>e.life>0);
      const p=s.projectile;
      if(p) {
        const nx=p.x+p.dx*720*dt,ny=p.y+p.dy*720*dt;let hit=null;
        for(const b of positions(s)) {const t=hitTime(p.x,p.y,nx,ny,b.x,b.y);if(t!==null&&(!hit||t<hit.t))hit={...b,t};}
        if(hit) {s.projectile=null;impact(s,hit.index);}
        else {p.x=nx;p.y=ny;if(nx< -25||nx>505||ny< -25||ny>525){s.projectile=null;s.message='Мимо! Попробуй ещё раз';}}
      }
      while(s.status==='running'&&s.balls.length&&s.offset+(s.balls.length-1)*GAP>=E.ZUMA_LENGTH-12) {
        if(formats[s.balls.at(-1).type].risk){s.status='lost';s.projectile=null;s.message='Опасный файл у сервера. Ещё раз?';}
        else {s.balls.pop();s.delivered++;}
      }
    }
  }
  function hint(s) {
    if(s.status!=='running'||s.projectile)return null;
    const balls=positions(s);
    for(const target of [...balls].reverse()) {
      if(!formats[target.type].risk||target.x<5||target.y<5)continue;
      let first=null;
      for(const b of balls) {const t=hitTime(230,260,target.x,target.y,b.x,b.y);if(t!==null&&(!first||t<first.t))first={...b,t};}
      if(first?.id===target.id){s.aim={x:target.x,y:target.y};s.message=`Цель: ${formats[target.type].ext}`;return target;}
    }
    s.message='Цель закрыта. Подожди немного';return null;
  }
  const words=['Комета','Кактус','Ракета','Облако','Манго','Робот','Вулкан','Панда'];
  function passwordCheck(tokens) {
    return {long:tokens.join('-').length>=16,varied:new Set(tokens).size===4&&tokens.length===4,unpredictable:tokens.every(w=>words.includes(w))};
  }
  const council = [
    {who:'Мила',title:'Фото с нашей прогулки',text:'Друг просит выложить общее фото в чат. На нём есть другие ребята.',options:['Сначала спросить ребят','Выложить без спроса'],answer:0,why:'Каждый сам решает, где можно показывать его фото.'},
    {who:'Пиксель',title:'Игре нужен микрофон?',text:'Простая головоломка просит доступ к контактам и микрофону. Для игры они не нужны.',options:['Разрешить всё сразу','Отключить лишние доступы'],answer:1,why:'Лишние разрешения открывают доступ к твоим данным. Отключи их.'},
    {who:'Мила',title:'Пора отдохнуть',text:'Вы с другом долго играете. Глаза устали, но он зовёт ещё на один раунд.',options:['Договориться о перерыве','Играть через усталость'],answer:0,why:'Усталость — сигнал сделать перерыв.'},
    {who:'Пиксель',title:'Обновление готово',text:'В настройках устройства появилось обновление. Оно исправляет ошибки защиты.',options:['Никогда не обновлять','Установить со взрослым'],answer:1,why:'Обновления исправляют ошибки защиты. Ставь их через настройки или официальный магазин.'},
    {who:'Мила',title:'Обидные сообщения',text:'В игровом чате незнакомец обижает твоего друга. Как помочь?',options:['Поддержать, пожаловаться и позвать взрослого','Оскорбить обидчика в ответ'],answer:0,why:'Оскорбления усиливают ссору. Поддержи друга, сохрани сообщения и позови взрослого.'},
    {who:'Фуфелкрендель',title:'Отключим защиту?',text:'«Защита только мешает играть! Давай отключим её навсегда», — предлагает Фуфелкрендель. Что сделаешь?',options:['Отключить ради игры','Оставить защиту и позвать взрослого'],answer:1,why:'Защита помогает замечать угрозы. Если она мешает игре, разберись со взрослым, а не отключай её.'}
  ];
  const messages=[
    {title:'«Бесплатные кристаллы!»',text:'Незнакомец обещает: «Открой ссылку — получишь 1000 кристаллов в подарок!»',options:['Открыть ссылку','Закрыть и пожаловаться'],answer:1,why:'Приз может быть приманкой. Проверяй предложение через саму игру.'},
    {title:'Учитель прислал задание',text:'В знакомом школьном чате учитель прислал текст задания. Ссылок и просьб о секретах нет.',options:['Прочитать задание','Сообщить, что любое сообщение опасно'],answer:0,why:'Ожидаемое задание пришло из проверенного школьного чата.'},
    {title:'Друг внезапно просит код',text:'«Срочно пришли код из СМС, я не могу войти!» — сообщение пришло с аккаунта друга.',options:['Отправить: это же друг','Позвонить другу, код не отправлять'],answer:1,why:'Аккаунт друга могли взломать. Не отправляй код — позвони другу.'}
  ];
  const privacy=[
    {title:'Профиль игрока',text:'Что можно указать в открытом игровом профиле?',options:['Домашний адрес и номер школы','Выдуманный ник и любимую игру'],answer:1,why:'Ник и увлечения можно показать. Адрес, телефон и школу — не стоит.'},
    {title:'Снимок билета',text:'Ты хочешь показать поездку в общем чате. На фото билета видны имя и QR-код.',options:['Выбрать фото пейзажа без личных данных','Выложить билет целиком'],answer:0,why:'Билет и QR-код раскрывают личные данные. Покажи пейзаж.'},
    {title:'Если ошибся',text:'Ты уже отправил незнакомцу личную информацию. Что делать?',options:['Скрыть всё от взрослых','Рассказать взрослому, которому доверяешь'],answer:1,why:'Взрослый поможет удалить данные и защитить аккаунт. Просить помощи — правильно.'}
  ];
  council[0].followup={
    title:'Друг просит удалить фото',
    text:'Фото уже в чате. Друг пишет: «Мне не нравится, что его видят все. Удали, пожалуйста». Что сделаешь?',
    options:['Удалить и извиниться','Оставить: мне фото нравится'],answer:0,
    why:'Друг вправе попросить удалить своё фото. Уважай его решение.',
    outcomes:['Фото удалено. Друг видит, что ты уважаешь его просьбу.','Фото осталось в чате, хотя друг против. Ему неприятно, и доверия стало меньше.']
  };
  council[1].followup={
    title:'Приглашения всем знакомым?',
    text:'Ты разрешил доступ. Теперь головоломка предлагает разослать приглашение всем людям из твоих контактов.',
    options:['Отправить приглашения всем','Отказаться и убрать лишние доступы'],answer:1,
    why:'Контакты — чужие личные данные. Отключи ненужные разрешения в настройках.',
    outcomes:['Знакомые получили нежелательные приглашения. Некоторым это мешает.','Приглашения не отправлены. У игры больше нет лишнего доступа к контактам и микрофону.']
  };
  council[4].followup={
    title:'Ссора стала громче',
    text:'После твоего ответного оскорбления в чате появились новые обидные сообщения. Друг расстроился ещё сильнее.',
    options:['Прекратить спор и позвать взрослого','Написать ещё более обидный ответ'],answer:0,
    why:'Оскорбления не помогают. Сохрани сообщения, пожалуйся и позови взрослого.',
    outcomes:['Ты перестал поддерживать ссору. Друг получил поддержку, а взрослый поможет разобраться.','Перепалка продолжается. Новые оскорбления не помогают другу и могут задеть других.']
  };
  council[5].followup={
    title:'Защита выключена',
    text:'Устройство сообщает: «Защита отключена». Фуфелкрендель уговаривает не обращать внимания. Что делать?',
    options:['Играть, не обращая внимания','Включить защиту и позвать взрослого'],answer:1,
    why:'Верни защиту. Вместе со взрослым проверь, почему она мешала игре.',
    outcomes:['Защита остаётся выключенной — устройству труднее обнаружить угрозы.','Защита снова включена. Взрослый поможет разобраться с предупреждением.']
  };
  messages[0].followup={
    title:'Страница требует «защиту»',
    text:'По ссылке открылась страница: «У вас вирус! Срочно установите нашу защиту!» Рядом кнопка загрузки. Что сделаешь?',
    options:['Установить предложенную программу','Закрыть страницу и рассказать взрослому'],answer:1,
    why:'Надпись на сайте не доказывает заражение. Не устанавливай неизвестную «защиту».',
    outcomes:['Ты выбрал установку неизвестной программы. В жизни она может навредить устройству. В этой игре ничего не скачивается.','Страница закрыта без установки. Взрослый поможет проверить ситуацию через настройки и знакомые средства защиты.']
  };
  messages[2].followup={
    title:'Кто-то вошёл в аккаунт',
    text:'После отправки кода пришло уведомление о незнакомом входе в твой аккаунт. Как вернуть контроль?',
    options:['Позвать взрослого и открыть восстановление в сервисе','Отправить в чат ещё один код'],answer:0,
    why:'Со взрослым восстанови доступ через сам сервис, смени пароль и заверши чужие сеансы.',
    outcomes:['Взрослый поможет вернуть доступ через официальный сервис и закрыть незнакомые сеансы.','Ещё один код может снова дать постороннему доступ. Восстановить контроль так не получится.']
  };
  const passwordQuestions=[
    {who:'Мила',title:'Один пароль на всё?',text:'Ты собрал учебный пароль. Фуфелкрендель советует поставить его на все аккаунты. Что выберешь?',options:['Один пароль везде — удобно','Отдельный пароль для каждого аккаунта'],answer:1,why:'Разные пароли защищают остальные аккаунты при взломе одного. Хранить их поможет менеджер паролей.'},
    {who:'Пиксель',title:'Добавь второй замок',text:'Если кто-то узнает пароль, что ещё поможет защитить вход?',options:['Дополнительная проверка входа со взрослым','Отправить пароль другу на хранение'],answer:0,why:'Двухфакторная защита добавляет проверку входа. Настрой её со взрослым; коды никому не сообщай.'}
  ];
  const fileQuestions=[
    {who:'Пиксель',title:'Что отправить в карантин?',text:'Незнакомец прислал bonus.exe и просит запустить его ради приза. Почему стоит остановиться?',options:['.EXE может запустить неизвестную программу','Все файлы с точкой вредоносны'],answer:0,why:'.EXE запускает программу. Неизвестный файл может навредить — проверь источник со взрослым.'},
    {who:'Мила',title:'Картинка всегда безопасна?',text:'Пришёл файл от незнакомца с расширением .PNG. Можно ли открыть его только потому, что это картинка?',options:['Да, картинки всегда безопасны','Нет, нужно проверить источник и полное имя'],answer:1,why:'Расширение не гарантирует безопасность. Не открывай неизвестное вложение.'}
  ];
  fileQuestions.push({who:'Пиксель',title:'Фото или программа?',filename:'photo.jpg.exe',text:'Незнакомец прислал photo.jpg.exe: «Это фото, открой!» Можно ли его открыть?',options:['Да, в имени есть .jpg — это фото','Нет: последнее расширение .exe'],answer:1,why:'Последнее расширение photo.jpg.exe — .exe. Это программа, а не фото: не открывай её.'});
  council.forEach((q,i)=>Object.assign(q,{category:'Цифровая гигиена',art:`council-${i}`}));
  council.push(
    ...privacy.map((q,i)=>({...q,who:'Мила',category:'Личные данные',art:`privacy-${i}`}))
  );
  // Personal information and photo consent now belong to the park's generators.
  const parkQuestions=[council[0],...council.filter(q=>q.category==='Личные данные')];
  council.splice(0,council.length,...council.filter(q=>!parkQuestions.includes(q)));
  const parkScenes=[
    {
      title:'Открытый профиль',art:'profile',
      description:'Закрой личные сведения наклейками. Ник и увлечения оставь видимыми.',
      items:[
        {id:'nickname',label:'Ник: ЛунныйКактус',private:false,x:5,y:19,w:42,h:20,kind:'nickname'},
        {id:'address',label:'ул. Облачная, 7',private:true,x:53,y:19,w:42,h:20,kind:'address'},
        {id:'phone',label:'+7 *** *** 12 34',private:true,x:5,y:49,w:42,h:20,kind:'phone'},
        {id:'hobby',label:'Люблю рисовать',private:false,x:53,y:49,w:42,h:20,kind:'activity'}
      ],
      why:'Ник и хобби можно показать. Домашний адрес и номер телефона лучше не публиковать: они помогают незнакомцам найти человека.'
    },
    {
      title:'Открытка из поездки',art:'trip',
      description:'На открытку попал билет. Закрой имя пассажира и код, сохрани впечатления.',
      items:[
        {id:'scenery',label:'Горы и облака',private:false,x:5,y:19,w:42,h:20,kind:'landscape'},
        {id:'ticket-name',label:'Мила Примерова',private:true,x:53,y:19,w:42,h:20,kind:'name'},
        {id:'ticket-code',label:'Код билета',private:true,x:5,y:49,w:42,h:20,kind:'qr'},
        {id:'memory',label:'Отличная поездка!',private:false,x:53,y:49,w:42,h:20,kind:'activity'}
      ],
      why:'Код билета и имя пассажира могут раскрыть данные о поездке. Пейзаж и рассказ о впечатлениях позволяют поделиться радостью без этих сведений.'
    },
    {
      title:'Пост о любимой игре',art:'chat',
      description:'Укрась пост наклейками: закрой адрес, телефон и школу. Оставь ник и любимую игру.',
      items:[
        {id:'game',label:'Игра: Космокубики',private:false,x:5,y:15,w:42,h:19,kind:'game'},
        {id:'school',label:'Школа «Комета»',private:true,x:53,y:15,w:42,h:19,kind:'school'},
        {id:'contact',label:'+7 *** *** 56 78',private:true,x:5,y:43,w:42,h:19,kind:'phone'},
        {id:'gamer',label:'Ник: ЗвёздныйЛис',private:false,x:53,y:43,w:42,h:19,kind:'nickname'},
        {id:'home',label:'ул. Радужная, 3',private:true,x:5,y:71,w:90,h:19,kind:'address'}
      ],
      why:'Для знакомства в игре достаточно ника и интересов. Адрес, телефон и название своей школы не стоит оставлять в открытом посте.'
    }
  ];
  function createPark() {return {index:0,selected:[],status:'playing',feedback:null,mistakes:0};}
  function toggleParkItem(s,id) {
    if(s.status!=='playing'||!parkScenes[s.index]?.items.some(item=>item.id===id))return false;
    const index=s.selected.indexOf(id);
    if(index<0)s.selected.push(id);else s.selected.splice(index,1);
    s.feedback=null;
    return true;
  }
  function checkPark(s) {
    const scene=parkScenes[s.index];
    if(s.status!=='playing'||!scene)return false;
    const selected=new Set(s.selected);
    const missed=scene.items.some(item=>item.private&&!selected.has(item.id));
    const extra=s.selected.some(id=>!scene.items.find(item=>item.id===id)?.private);
    if(missed||extra){
      s.mistakes++;
      s.feedback={correct:false,text:missed&&extra?'Личные данные ещё видны, а часть обычных деталей закрыта. Переставь наклейки.':missed?'На открытке ещё видны личные данные. Добавь наклейки.':'Ник, интересы и впечатления можно оставить. Убери лишние наклейки.'};
      return false;
    }
    s.status='feedback';s.feedback={correct:true,text:scene.why};return true;
  }
  function nextPark(s) {
    if(s.status!=='feedback'||!s.feedback?.correct)return false;
    if(s.index===parkScenes.length-1){s.status='complete';return true;}
    s.index++;s.selected=[];s.status='playing';s.feedback=null;return true;
  }
  function activeQuestion(q,s) {return s.branch&&q.followup?q.followup:q;}
  function answerQuestion(q,s,choice) {
    if(!Number.isInteger(choice)||choice<0||choice>1||s.feedback||s.choice!=null)return false;
    const active=activeQuestion(q,s);
    if(!s.branch&&q.followup&&choice!==active.answer) {
      s.branch=true;s.choice=null;s.feedback=false;
    } else {
      s.choice=choice;s.feedback=true;
    }
    return true;
  }
  return {GAP,formats,createFiles,stepFiles,hint,impact,shoot:E.shootZuma,positions,words,passwordCheck,passwordQuestions,fileQuestions,parkQuestions,council,messages,privacy,activeQuestion,answerQuestion,parkScenes,createPark,toggleParkItem,checkPark,nextPark};
})();
