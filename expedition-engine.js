'use strict';

// Pure game rules. No DOM, timers, persistence, or network access.
const ExpeditionEngine = (() => {
  const SIZE = 6;
  const TARGET = 0;
  const FILES = [
    { ext: '.EXE', name: 'bonus.exe', icon: '!', kind: 'risk', source: 'Неизвестный отправитель обещает подарок и просит запустить программу.' },
    { ext: '.PDF', name: 'lesson.pdf', icon: '≡', kind: 'document', source: 'Задание из школьного портала. Учитель подтвердил файл.' },
    { ext: '.PNG', name: 'drawing.png', icon: '✿', kind: 'picture', source: 'Твой собственный рисунок, который ты только что сохранил.' },
    { ext: '.TXT', name: 'notes.txt', icon: 'Aa', kind: 'text', source: 'Заметки, которые ты написал на этом устройстве.' }
  ];
  const pick = (items, random) => items[Math.min(items.length - 1, Math.floor(random() * items.length))];
  const adjacent = (a, b) => Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= 0 && a < SIZE * SIZE && b < SIZE * SIZE && Math.abs(a % SIZE - b % SIZE) + Math.abs(Math.floor(a / SIZE) - Math.floor(b / SIZE)) === 1;

  function matches(board, type = TARGET) {
    const found = new Set();
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const start = y * SIZE + x;
      if (board[start] !== type) continue;
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const run = [];
        for (let xx = x, yy = y; xx < SIZE && yy < SIZE && board[yy * SIZE + xx] === type; xx += dx, yy += dy) run.push(yy * SIZE + xx);
        if (run.length >= 3) run.forEach(i => found.add(i));
      }
    }
    return [...found];
  }

  function legalMoves(board) {
    const moves = [];
    for (let a = 0; a < board.length; a++) for (const b of [a + 1, a + SIZE]) {
      if (!adjacent(a, b) || board[a] === board[b]) continue;
      const next = [...board];
      [next[a], next[b]] = [next[b], next[a]];
      const removed = matches(next);
      if (removed.length) moves.push({ a, b, count: removed.length, cells: removed });
    }
    return moves.sort((a, b) => b.count - a.count);
  }

  function makeBoard(random = Math.random) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const board = [];
      for (let i = 0; i < SIZE * SIZE; i++) {
        const options = [0, 0, 1, 2, 3].filter(type => !(i % SIZE >= 2 && board[i - 1] === type && board[i - 2] === type) && !(i >= SIZE * 2 && board[i - SIZE] === type && board[i - SIZE * 2] === type));
        board.push(pick(options, random));
      }
      if (legalMoves(board).length) return board;
    }
    // A deterministic playable fallback also handles a constant injected RNG.
    return [0,0,1,2,3,1, 2,3,0,1,2,3, 1,2,3,0,1,2, 3,1,2,3,0,1, 2,3,1,2,3,0, 1,2,3,1,2,3];
  }

  function createMatch(random = Math.random) {
    return { board: makeBoard(random), removed: 0, goal: 12, moves: 0, finished: false, hint: [], message: 'Собери ряд из трёх подозрительных .EXE. Нажми на два соседних файла или перетащи один к другому.' };
  }

  function swapFiles(state, a, b, random = Math.random) {
    if (state.finished || !adjacent(a, b)) return { valid: false, reason: 'Выбери два соседних файла: по горизонтали или вертикали.' };
    const board = [...state.board];
    [board[a], board[b]] = [board[b], board[a]];
    let removed = matches(board);
    if (!removed.length) return { valid: false, reason: 'Подозрительные .EXE не собрались в ряд. Проверенные файлы оставляем на месте — попробуй другую пару.' };
    const initial = [...removed];
    const swappedBoard = [...board];
    let total = 0, cascades = 0;
    while (removed.length && cascades < 20) {
      total += removed.length;
      cascades++;
      const empty = new Set(removed);
      for (let x = 0; x < SIZE; x++) {
        const column = [];
        for (let y = SIZE - 1; y >= 0; y--) if (!empty.has(y * SIZE + x)) column.push(board[y * SIZE + x]);
        for (let y = SIZE - 1, i = 0; y >= 0; y--, i++) board[y * SIZE + x] = i < column.length ? column[i] : pick([0, 1, 2, 3], random);
      }
      removed = matches(board);
    }
    // Re-deal a stuck board; the target count is retained. Never loop forever on an RNG.
    const reshuffled = removed.length > 0 || !legalMoves(board).length;
    state.board = reshuffled ? makeBoard(random) : board;
    state.removed += total;
    state.moves++;
    state.finished = state.removed >= state.goal;
    state.hint = [];
    state.message = `В карантин отправлено ${total} подозрительных файлов.${cascades > 1 ? ` Цепная реакция: ${cascades}!` : ''}${reshuffled ? ' Новая раскладка: на старой не осталось ходов.' : ''}`;
    return { valid: true, removed: total, initial, swappedBoard, cascades, reshuffled };
  }

  function showHint(state) {
    const move = legalMoves(state.board)[0];
    state.hint = move ? [move.a, move.b] : [];
    return move;
  }

  // A sampled, non-self-intersecting route. Distances make speed independent of frame rate.
  const ZUMA_TYPES = [
    { name: 'Троян', file: 'bonus.exe', mark: 'Т', color: '#de927b', dark: '#965343', explanation: 'Троян маскируется под полезную программу. Не устанавливай подарки из неизвестного источника.' },
    { name: 'Шпион', file: 'spy.js', mark: 'Ш', color: '#aa93ca', dark: '#69528d', explanation: 'Шпионское ПО может собирать личные данные. Не запускай неизвестные файлы и проверяй разрешения приложений.' },
    { name: 'Шифровальщик', file: 'lock.zip', mark: 'З', color: '#83b5c0', dark: '#457c8a', explanation: 'Шифровальщик может заблокировать доступ к файлам. Обновления и отдельные резервные копии помогают защититься.' }
  ];
  const ZUMA_FROG = { x: 230, y: 260 };
  const ZUMA_GAP = 31;
  const routePoints = [[-20,65],[375,65],[430,115],[430,380],[380,440],[100,440],[50,390],[50,175],[100,120],[320,120],[370,170],[370,325],[320,375],[160,375],[110,325],[110,230],[155,185],[260,185],[305,230],[305,280],[270,320],[225,320]];
  const zumaPath = [{x:routePoints[0][0],y:routePoints[0][1],distance:0}];
  // Rounded corners with quadratic curves, sampled once; geometry is shared by UI and physics.
  function appendPoint(x,y) {
    const last=zumaPath[zumaPath.length-1];
    zumaPath.push({x,y,distance:last.distance+Math.hypot(x-last.x,y-last.y)});
  }
  for(let i=1;i<routePoints.length-1;i++) {
    const prev=routePoints[i-1], here=routePoints[i], next=routePoints[i+1];
    const before=[here[0]+(prev[0]-here[0])*.18,here[1]+(prev[1]-here[1])*.18];
    const after=[here[0]+(next[0]-here[0])*.18,here[1]+(next[1]-here[1])*.18];
    appendPoint(...before);
    for(let j=1;j<=8;j++) {const t=j/8;appendPoint((1-t)**2*before[0]+2*(1-t)*t*here[0]+t*t*after[0],(1-t)**2*before[1]+2*(1-t)*t*here[1]+t*t*after[1]);}
  }
  appendPoint(...routePoints[routePoints.length-1]);
  const ZUMA_LENGTH=zumaPath[zumaPath.length-1].distance;
  function zumaPoint(distance) {
    if(distance<=0) return {...zumaPath[0]};
    for(let i=1;i<zumaPath.length;i++) if(zumaPath[i].distance>=distance) {
      const a=zumaPath[i-1],b=zumaPath[i],t=(distance-a.distance)/(b.distance-a.distance);
      return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
    }
    return {...zumaPath[zumaPath.length-1]};
  }
  function zumaPositions(state) { return state.balls.map((ball,i)=>({...ball,...zumaPoint(state.offset+i*ZUMA_GAP),index:i})); }
  function createZuma(random=Math.random) {
    const balls=[];
    let previous=-1;
    for(let group=0;group<12;group++) {
      const type=pick([0,1,2].filter(t=>t!==previous),random);
      balls.push({id:balls.length,type,original:true},{id:balls.length+1,type,original:true}); previous=type;
    }
    return {balls,offset:60,speed:7,status:'ready',ammo:balls[0].type,aim:{x:230,y:65},projectile:null,shots:0,cleared:0,total:24,combo:0,effects:[],nextId:24,elapsed:0,message:'В цепочке — учебные образцы, уже помеченные анализатором как вредоносные. Собери по три одинаковых и отправь их в карантин.'};
  }
  function setZumaAmmo(state,type) {
    if(!Number.isInteger(type)||!ZUMA_TYPES[type]||['lost','won'].includes(state.status)||state.projectile) return false;
    if(!state.balls.some(ball=>ball.type===type)) return false;
    state.ammo=type; return true;
  }
  function shootZuma(state,x=state.aim.x,y=state.aim.y) {
    if(state.status!=='running'||state.projectile||!Number.isFinite(x)||!Number.isFinite(y)) return false;
    const dx=x-ZUMA_FROG.x,dy=y-ZUMA_FROG.y,length=Math.hypot(dx,dy);
    if(length<20) return false;
    state.aim={x,y};
    state.projectile={x:ZUMA_FROG.x,y:ZUMA_FROG.y,dx:dx/length,dy:dy/length,type:state.ammo};
    state.shots++; return true;
  }
  function segmentHit(ax,ay,bx,by,cx,cy,radius) {
    const dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy;
    const t=length?Math.max(0,Math.min(1,((cx-ax)*dx+(cy-ay)*dy)/length)):0;
    return Math.hypot(ax+t*dx-cx,ay+t*dy-cy)<=radius?t:null;
  }
  function insertZumaBall(state,index,type,after=true) {
    if(state.status!=='running'||index<0||index>=state.balls.length||!ZUMA_TYPES[type]) return false;
    let at=index+(after?1:0);
    state.balls.splice(at,0,{id:state.nextId++,type,original:false});
    let chain=0,removed=0;
    while(state.balls.length) {
      let left=at,right=at;
      while(left>0&&state.balls[left-1].type===state.balls[at].type) left--;
      while(right+1<state.balls.length&&state.balls[right+1].type===state.balls[at].type) right++;
      if(right-left+1<3) break;
      const group=state.balls.slice(left,right+1);
      state.cleared+=group.filter(ball=>ball.original).length;
      for(let i=left;i<=right;i++) state.effects.push({...zumaPoint(state.offset+i*ZUMA_GAP),type:state.balls[i].type,life:.55});
      removed+=group.length; chain++;
      state.balls.splice(left,right-left+1);
      state.offset=Math.max(20,state.offset-12);
      // Only a newly joined boundary can trigger a chain reaction.
      if(left===0||left===state.balls.length||state.balls[left-1].type!==state.balls[left].type) break;
      at=left;
    }
    state.combo=chain;
    if(!state.balls.length) {
      state.status='won'; state.message='Все вредоносные файлы в карантине! Городской сервер защищён.';
    } else {
      if(!state.balls.some(ball=>ball.type===state.ammo)) state.ammo=state.balls[0].type;
      state.message=removed?`В карантин: ${removed}.${chain>1?' Цепная реакция ×'+chain+'!':''} ${ZUMA_TYPES[type].explanation}`:'Файл добавился в цепочку. Выбери такой же знак и собери группу из трёх.';
    }
    return {removed,chain};
  }
  function stepZuma(state,seconds) {
    if(state.status!=='running'||!Number.isFinite(seconds)||seconds<=0) return false;
    // Substeps prevent tunnelling at low frame rates. A suspended tab never catches up in a jump.
    let remaining=Math.min(seconds,.25);
    while(remaining>0&&state.status==='running') {
      const dt=Math.min(remaining,1/60); remaining-=dt;
      state.elapsed+=dt; state.offset+=state.speed*dt;
      state.effects=state.effects.map(e=>({...e,life:e.life-dt})).filter(e=>e.life>0);
      const shot=state.projectile;
      if(shot) {
        const nx=shot.x+shot.dx*720*dt,ny=shot.y+shot.dy*720*dt;
        let hit=null;
        for(const ball of zumaPositions(state)) {
          const t=segmentHit(shot.x,shot.y,nx,ny,ball.x,ball.y,22);
          if(t!==null&&(!hit||t<hit.t)) hit={...ball,t};
        }
        if(hit) {
          const before=zumaPoint(state.offset+hit.index*ZUMA_GAP-2),after=zumaPoint(state.offset+hit.index*ZUMA_GAP+2);
          const ahead=(shot.x-hit.x)*(after.x-before.x)+(shot.y-hit.y)*(after.y-before.y)>0;
          state.projectile=null; insertZumaBall(state,hit.index,shot.type,ahead);
        } else {
          shot.x=nx; shot.y=ny;
          if(nx < -25||nx>505||ny < -25||ny>525) {state.projectile=null;state.message='Мимо — ничего страшного. Прицелься в цепочку или нажми «Подсказать цель».';}
        }
      }
      if(state.status==='running'&&state.offset+(state.balls.length-1)*ZUMA_GAP>=ZUMA_LENGTH-12) {
        state.status='lost';state.projectile=null;state.message='Цепочка добралась до сервера. Попробуй снова: выбирай знак и соединяй одинаковые файлы.';
      }
    }
    return true;
  }
  function zumaHint(state) {
    if(!state.balls.length||state.projectile) return null;
    const positions=zumaPositions(state),candidates=[];
    for(const target of positions) {
      if(target.x<5||target.x>475||target.y<5||target.y>495) continue;
      let first=null;
      for(const ball of positions) {
        const t=segmentHit(ZUMA_FROG.x,ZUMA_FROG.y,target.x,target.y,ball.x,ball.y,22);
        if(t!==null&&(!first||t<first.t)) first={...ball,t};
      }
      if(!first||first.index!==target.index) continue;
      let count=1;
      for(let i=target.index-1;i>=0&&positions[i].type===target.type;i--) count++;
      for(let i=target.index+1;i<positions.length&&positions[i].type===target.type;i++) count++;
      candidates.push({...target,count});
    }
    candidates.sort((a,b)=>b.count-a.count||b.index-a.index);
    const target=candidates[0];
    if(target) {state.ammo=target.type;state.aim={x:target.x,y:target.y};}
    return target||null;
  }

  const lessons = {
    files: {
      title: 'Почему эти файлы попали в карантин?',
      prompt: 'Мы убрали bonus.exe из рассылки незнакомца. Что помогло заметить риск?',
      options: ['Любой файл .EXE — обязательно вирус.', 'Незнакомец предлагает запустить программу ради подарка.', 'Файл просто оранжевого цвета.'],
      answer: 1,
      explanation: '.EXE может запускать программу. Неизвестный источник и обещание подарка — повод не открывать файл и обратиться к доверенному взрослому. Само расширение не доказывает, что внутри вирус.'
    },
    zuma: {
      title: 'Карантин — это защита',
      prompt: 'В игре анализатор уже выявил вредоносные файлы. Что делать, если защита устройства обнаружила такой файл в жизни?',
      options: ['Запустить файл, чтобы посмотреть, что он делает.', 'Отправить его друзьям для проверки.', 'Не запускать и не пересылать; следовать указаниям защиты и позвать доверенного взрослого.'],
      answer: 2,
      explanation: 'Карантин изолирует подозрительный или вредоносный файл. Не отключай защиту ради запуска. Вместе со взрослым проверь предупреждение, обновления и резервные копии. Расширение файла само по себе не доказывает заражение.'
    }
  };

  const quizzes = {
    source: [
      { title: 'Картинка с секретом', file: 'котик.png.exe', prompt: 'Незнакомец прислал «смешную картинку». Какое расширение в конце имени?', options: ['.png — это точно картинка', '.exe — это может быть запускаемая программа', 'По имени нельзя заметить ничего необычного'], answer: 1, explanation: 'Смотри на окончание полного имени: здесь .exe. Двойное расширение может маскировать программу под картинку. Не открывай это вложение; попроси взрослого помочь с проверкой.' },
      { title: 'Знакомый значок — не гарантия', file: 'prize.pdf', prompt: 'Неизвестный аккаунт прислал PDF и обещает приз за данные банковской карты. Открыть?', options: ['Да, все PDF безопасны.', 'Нет: проверю отправителя, данные карты не отправлю.', 'Перешлю друзьям, пусть проверят на себе.'], answer: 1, explanation: 'PDF тоже может содержать опасные ссылки или содержимое. Проверяй источник и смысл просьбы, а не только значок и расширение.' },
      { title: 'Нужная программа', file: 'drawing-setup.exe', prompt: 'Для урока нужен редактор. Где вместе со взрослым взять установщик?', options: ['У первого незнакомца, который обещает бесплатный бонус.', 'В случайном вложении из чата.', 'На официальном сайте разработчика или в проверенном магазине.'], answer: 2, explanation: 'Файлы .EXE бывают обычными установщиками. Их выбирают по проверенному источнику и необходимости, а не по обещанию подарка. Перед установкой посоветуйся со взрослым.' }
    ],
    final: [
      { title: 'Один ключ на все двери?', file: '●●●● → 3 аккаунта', prompt: 'У тебя длинный пароль. Можно поставить его сразу в игре, почте и школьном портале?', options: ['Нет. Для каждого аккаунта нужен отдельный пароль.', 'Да, если добавить в конце восклицательный знак.', 'Да, длина защищает от всех опасностей.'], answer: 0, explanation: 'Если один сервис потеряет пароль, его могут попробовать на других. Уникальный пароль помогает защитить остальные аккаунты.' },
      { title: 'Ещё один слой защиты', file: 'пароль + подтверждение', prompt: 'Что помогает защитить аккаунт вместе с длинным уникальным паролем?', options: ['Отправить пароль лучшему другу на хранение.', 'Отключить обновления.', 'Настроить дополнительное подтверждение входа со взрослым.'], answer: 2, explanation: 'Двухфакторная защита добавляет проверку при входе. Коды и запросы подтверждения нельзя передавать незнакомцам или одобрять, когда ты сам не входишь.' },
      { title: 'Последняя уловка Фуфелкренделя', file: 'Срочно! Приз исчезает!', prompt: '«Запусти подарок.exe и введи пароль от почты. Скорее!» Твой ход?', options: ['Запустить, пока приз не исчез.', 'Остановиться, ничего не вводить и показать сообщение взрослому.', 'Отправить пароль, но не запускать файл.'], answer: 1, explanation: 'Спешка, неизвестная программа и просьба о чужом пароле — сразу три сигнала риска. Ты умеешь остановиться, проверить и попросить помощи.' }
    ]
  };

  return { SIZE, FILES, createMatch, matches, legalMoves, swapFiles, showHint, makeBoard, adjacent, ZUMA_TYPES, ZUMA_FROG, ZUMA_LENGTH, ZUMA_GAP, zumaPath, createZuma, zumaPositions, zumaPoint, setZumaAmmo, shootZuma, insertZumaBall, stepZuma, zumaHint, lessons, quizzes };
})();
