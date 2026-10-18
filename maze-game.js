'use strict';

/* The engine is independent of the DOM so movement and educational gates can be tested. */
const MazeGame = (() => {
  const GRID = ['###########','#.........#','#.###.###.#','#...#.#...#','###.#.#.###','#.........#','#.###.###.#','#...#.#...#','#.#.#.#.#.#','#.........#','###########'];
  const START = {x:5,y:5};
  const SYSTEMS = [{x:1,y:1,name:'Фото друзей'},{x:9,y:1,name:'Личный профиль'},{x:1,y:9,name:'Данные билета'},{x:9,y:9,name:'Помощь взрослого'}];
  const ROUTES = [Array.from({length:5},(_,i)=>({x:3+i,y:1})),Array.from({length:5},(_,i)=>({x:3+i,y:9})),[{x:5,y:3},{x:5,y:4},{x:5,y:5},{x:6,y:5},{x:7,y:5}]];
  const walkable=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&GRID[y]?.[x]==='.';
  const create=()=>({player:{...START},done:[],pending:null,choice:null,feedback:null,status:'ready',bumps:0,ticks:0,shield:3,notice:'Найди четыре системы защиты.',enemies:ROUTES.map((route,i)=>({index:i===2?0:2,direction:1,...route[i===2?0:2]}))});
  const resume=s=>{if(s.status==='ready'||s.status==='paused'){s.status='running';return true;}return false;};
  const freeze=s=>{if(s.status==='running')s.status='paused';};
  function collide(s){
    if(s.shield>0||!s.enemies.some(e=>e.x===s.player.x&&e.y===s.player.y))return false;
    s.player={...START};s.bumps++;s.shield=4;s.notice='Вирус вернул тебя к старту. Включённая защита сохранена!';return true;
  }
  function move(s,dx,dy){
    if(s.status!=='running'||Math.abs(dx)+Math.abs(dy)!==1||!walkable(s.player.x+dx,s.player.y+dy))return false;
    s.player={x:s.player.x+dx,y:s.player.y+dy};
    if(collide(s))return true;
    const id=SYSTEMS.findIndex(g=>g.x===s.player.x&&g.y===s.player.y);
    if(id>=0&&!s.done.includes(id)){s.pending=id;s.status='question';s.choice=null;s.feedback=null;}
    return true;
  }
  function tick(s){
    if(s.status!=='running')return false;
    s.ticks++;if(s.shield>0)s.shield--;
    s.enemies.forEach((e,i)=>{const route=ROUTES[i];if(e.index+e.direction<0||e.index+e.direction>=route.length)e.direction*=-1;e.index+=e.direction;Object.assign(e,route[e.index]);});
    collide(s);return true;
  }
  function answer(s,questions,choice){
    if(s.status!=='question'||s.pending===null)return false;
    const q=questions[s.pending];if(!q||!Number.isInteger(choice)||choice<0||choice>=q.options.length)return false;
    s.choice=choice;s.feedback=choice===q.answer?'correct':'retry';
    if(s.feedback==='correct'&&!s.done.includes(s.pending))s.done.push(s.pending);
    s.status='feedback';return s.feedback==='correct';
  }
  function continueQuestion(s){
    if(s.status!=='feedback')return false;
    if(s.feedback==='retry'){s.status='question';s.feedback=null;s.choice=null;return false;}
    s.pending=null;s.feedback=null;s.choice=null;s.shield=3;s.notice='Щит включён!';
    s.status=s.done.length===4?'won':'running';return s.status==='won';
  }
  let active=null;
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const shield='<path d="M0-7 6-5V0Q6 5 0 8Q-6 5-6 0V-5Z" fill="currentColor"/><path d="m-3 0 2 2 4-4" fill="none" stroke="#08392e" stroke-width="1.7"/>';
  function board(s){
    let art='';
    GRID.forEach((row,y)=>[...row].forEach((cell,x)=>{if(cell==='#')art+=`<rect x="${x*24+1}" y="${y*24+1}" width="22" height="22" rx="5" fill="#224c57" stroke="#37656b" stroke-width=".7"/>`;}));
    art+=`<circle cx="132" cy="132" r="8" fill="none" stroke="#6eb1bc" stroke-dasharray="2 2"/>`;
    SYSTEMS.forEach((g,i)=>{const done=s.done.includes(i);art+=`<g transform="translate(${g.x*24+12} ${g.y*24+12})" color="${done?'#64efa0':'#ffd777'}"><circle r="10" fill="${done?'#1d6348':'#485137'}"/>${shield}<text x="0" y="3" text-anchor="middle" font-size="8" fill="#12382b" font-weight="bold">${done?'':i+1}</text></g>`;});
    s.enemies.forEach(e=>{art+=`<g transform="translate(${e.x*24+12} ${e.y*24+12})"><path d="M-8-4-5-4-5-7H5V-4H8V5H5V8L2 5H-2L-5 8V5H-8Z" fill="#c49aff" stroke="#704cb5"/><path d="M-4-1h2m4 0h2" stroke="#30204b" stroke-width="2"/><path d="M-2 3h4" stroke="#30204b"/></g>`;});
    art+=`<g transform="translate(${s.player.x*24+12} ${s.player.y*24+12})">${s.shield?'<circle r="11" fill="none" stroke="#71f2b2" stroke-width="1.5"/>':''}<path d="M0-10v3" stroke="#ffe071" stroke-width="2"/><rect x="-8" y="-7" width="16" height="15" rx="5" fill="#9cf7d4"/><rect x="-6" y="-4" width="12" height="7" rx="3" fill="#143d47"/><path d="M-3-1h1m4 0h1" stroke="#9cf7d4" stroke-width="2"/><path d="M-4 9h2m4 0h2" stroke="#9cf7d4" stroke-width="2"/></g>`;
    return `<svg class="maze-board" viewBox="0 0 264 264" role="img" aria-label="Лабиринт. Пиксель: столбец ${s.player.x}, строка ${s.player.y}. Систем включено: ${s.done.length} из 4.">${art}</svg>`;
  }
  function ownButton(action,label,extra=''){return `<button type="button" class="maze-button" data-maze-action="${action}" ${extra}>${label}</button>`;}
  function render(){
    if(!active)return;
    const {state:s,questions,screen,top}=active;
    let overlay='';
    if(s.status==='ready'||s.status==='paused')overlay=`<div class="maze-curtain"><div class="maze-start"><span class="maze-big-shield">✦</span><h2>${s.status==='ready'?'Лабиринт защиты':'Игра на паузе'}</h2><p>Включи 4 щита. Обходи вирусы.</p>${ownButton('play',s.status==='ready'?'Играть':'Продолжить')}</div></div>`;
    if(s.pending!==null&&(s.status==='question'||s.status==='feedback')){
      const q=questions[s.pending], feedback=s.status==='feedback';
      overlay=`<div class="maze-question-layer"><section class="maze-question" role="dialog" aria-modal="true" aria-label="Вопрос о безопасности">${feedback?`<strong class="maze-feedback-title">${s.feedback==='correct'?'Защита включена!':'Давай разберёмся'}</strong><p>${escape(q.why)}</p>${ownButton('continue',s.feedback==='retry'?'Попробовать ещё':s.done.length===4?'Город защищён!':'Вернуться в лабиринт')}`:`<p>${escape(q.text)}</p><div class="maze-answers">${q.options.map((o,i)=>ownButton('answer',escape(o),`data-maze-choice="${i}"`)).join('')}</div>`}</section></div>`;
    }
    screen(`<section class="maze-game">${top?top(''):''}<header class="maze-heading"><div><span class="maze-kicker">Парк друзей</span><h1>Лабиринт защиты</h1></div><b class="maze-count">${s.done.length}/4</b></header><div class="maze-legend"><span>🤖 Пиксель</span><span class="maze-goal-label">◆ Защита</span><span class="maze-virus-label">◆ Вирус</span></div><div class="maze-field">${board(s)}${s.pending===null?overlay:''}</div><p class="maze-notice" aria-live="polite">${escape(s.notice)}</p><div class="maze-dpad" aria-label="Управление Пикселем">${ownButton('up','↑','aria-label="Вверх"')}${ownButton('left','←','aria-label="Влево"')}${ownButton('down','↓','aria-label="Вниз"')}${ownButton('right','→','aria-label="Вправо"')}</div>${s.pending!==null?overlay:''}</section>`);
    active.element=document.querySelector('.maze-game');
    active.element.addEventListener('click',handleClick);
    if(s.pending!==null)active.element.querySelector('.maze-question button')?.focus({preventScroll:true});
  }
  function updateBoard(){
    if(!active)return;const el=active.element,s=active.state;
    if(!el?.isConnected)return;
    const field=el.querySelector('.maze-field');field.innerHTML=board(s);
    el.querySelector('.maze-notice').textContent=s.notice;
  }
  function step(dx,dy){if(!active)return;const s=active.state;if(move(s,dx,dy)){if(s.status==='question')render();else updateBoard();}}
  function handleClick(event){
    if(!active)return;const target=event.target.closest('[data-maze-action]');
    if(!target){const svg=event.target.closest('.maze-board');if(svg&&active.state.status==='running'){const rect=svg.getBoundingClientRect(),x=Math.floor((event.clientX-rect.left)/rect.width*11),y=Math.floor((event.clientY-rect.top)/rect.height*11);step(x-active.state.player.x,y-active.state.player.y);}return;}
    const {state:s,questions}=active,action=target.dataset.mazeAction;
    if(action==='play'){resume(s);render();return;}
    if(action==='answer'){answer(s,questions,Number(target.dataset.mazeChoice));render();return;}
    if(action==='continue'){const won=continueQuestion(s);if(won){const callback=active.onComplete;destroy();callback?.();}else render();return;}
    const dirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};if(dirs[action])step(...dirs[action]);
  }
  function onKey(event){
    const dirs={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0],ц:[0,-1],ы:[0,1],ф:[-1,0],в:[1,0]};
    const dir=dirs[event.key]||dirs[event.key.toLowerCase()];if(!dir||!active?.element?.isConnected||active.state.status!=='running')return;event.preventDefault();step(...dir);
  }
  function pause(){if(active?.state.status==='running'){freeze(active.state);if(active.element?.isConnected)render();}}
  function onBlur(){pause();}
  function onVisibility(){if(document.hidden)onBlur();}
  function destroy(){
    if(!active)return;freeze(active.state);clearInterval(active.timer);active.element?.removeEventListener('click',handleClick);window.removeEventListener('keydown',onKey);window.removeEventListener('blur',onBlur);document.removeEventListener('visibilitychange',onVisibility);active=null;
  }
  function mount(options){
    destroy();
    if(!options.state||!Array.isArray(options.questions)||options.questions.length!==4)throw new Error('MazeGame needs state and exactly four questions');
    active={...options};freeze(active.state);render();
    window.addEventListener('keydown',onKey,{passive:false});window.addEventListener('blur',onBlur);document.addEventListener('visibilitychange',onVisibility);
    active.timer=setInterval(()=>{if(!active?.element?.isConnected||document.hidden)return;if(tick(active.state))updateBoard();},650);
  }
  return {create,mount,pause,destroy,GRID,START,SYSTEMS,ROUTES,walkable,resume,freeze,move,tick,answer,continueQuestion,collide};
})();
if(typeof window!=='undefined')window.MazeGame=MazeGame;
if(typeof module!=='undefined'&&module.exports)module.exports=MazeGame;
