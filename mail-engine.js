'use strict';

const MailEngine = (() => {
  const bins = Object.freeze([
    Object.freeze({id:'deliver',label:'Доставить'}),
    Object.freeze({id:'check',label:'Уточнить'}),
    Object.freeze({id:'quarantine',label:'Карантин'})
  ]);
  const messages = Object.freeze([
    {id:'school-task',sender:'Учитель в школьном чате',subject:'Задание по рисунку',body:'Нарисуйте любимое дерево к пятнице.',context:'Учитель заранее объявил задание. Это проверенный школьный канал.',clue:'Ожидаемое задание в проверенном канале.',bin:'deliver',why:'Ожидаемое задание пришло из проверенного школьного чата.'},
    {id:'prize-password',sender:'Подарки для игроков',subject:'Кристаллы в подарок!',body:'Пришли пароль от игры — начислим тебе кристаллы.',context:'Сообщение обещает приз в обмен на секрет.',clue:'За подарок просят пароль.',bin:'quarantine',why:'Пароль открывает доступ к аккаунту. Не отдавай его за приз.'},
    {id:'new-club-member',sender:'Новый участник кружка',subject:'Фотографии встречи',body:'Привет! Вот ссылка на фото нашего кружка.',context:'Ты пока не знаком с отправителем и не ждал ссылку.',clue:'Источник и ссылка ещё не проверены.',bin:'check',why:'Незнакомец не обязательно обманщик. Проверь отправителя со взрослым, не открывая ссылку.'},
    {id:'friend-code',sender:'Аккаунт друга',subject:'Помоги войти!',body:'Срочно перешли мне код входа из твоего СМС.',context:'Имя и аватар знакомые, но просьба неожиданная.',clue:'Просят твой секретный код входа.',bin:'quarantine',why:'Код нельзя пересылать даже друзьям. Аккаунт могли взломать — позвони другу.'},
    {id:'club-schedule',sender:'Руководитель кружка',subject:'Время встречи',body:'Встречаемся завтра после уроков, как договорились.',context:'Руководитель подтвердил расписание лично. Сообщение пришло в проверенный канал кружка.',clue:'Расписание заранее подтверждено лично.',bin:'deliver',why:'Расписание подтверждено лично, необычных просьб нет.'},
    {id:'surprise-friend-link',sender:'Аккаунт друга',subject:'Это про тебя?',body:'Скорее посмотри, что тут про тебя написали! [ссылка]',context:'Друг не предупреждал о ссылке. Кто её отправил, пока неизвестно.',clue:'Неожиданная ссылка даже от знакомого аккаунта.',bin:'check',why:'Знакомый аватар не доказывает, кто пишет. Проверь ссылку звонком другу.'},
    {id:'family-note',sender:'Семейный чат',subject:'Не забудь шарф',body:'На улице прохладно. Возьми шарф на прогулку.',context:'Ты только что поговорил с родителем, и он подтвердил это сообщение.',clue:'Родитель подтвердил сообщение другим способом.',bin:'deliver',why:'Родитель уже подтвердил сообщение, секретов не просит.'},
    {id:'contest-invite',sender:'Организатор выставки',subject:'Приглашение на конкурс',body:'Приглашаем прислать рисунок на нашу выставку.',context:'Ты впервые слышишь о выставке. Пароль и коды не просят.',clue:'Приглашение новое; сведений для решения мало.',bin:'check',why:'Новое приглашение не обязательно опасно. Со взрослым проверь организатора.'},
    {id:'fake-support',sender:'Поддержка игры',subject:'Сохрани свой аккаунт',body:'Пришли нам пароль, иначе сегодня удалим аккаунт!',context:'Сообщение торопит и пугает потерей игры.',clue:'Угрожают и требуют пароль в сообщении.',bin:'quarantine',why:'Угрозами выманивают пароль. Не отвечай; обратись со взрослым в сам сервис.'}
  ].map(Object.freeze));

  function create(random = Math.random) {
    if (typeof random !== 'function') throw new TypeError('Random source must be a function');
    const order = messages.map((_,index) => index);
    for (let i = order.length - 1; i > 0; i--) {
      const value = random();
      if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('Random value must be in [0, 1)');
      const j = Math.floor(value * (i + 1));
      [order[i],order[j]] = [order[j],order[i]];
    }
    return {order,index:0,status:'playing',sorted:0,mistakes:0,feedback:null};
  }

  function valid(s) {
    return !!s && Array.isArray(s.order) && s.order.length === messages.length &&
      new Set(s.order).size === messages.length && s.order.every(i => Number.isInteger(i) && i >= 0 && i < messages.length) &&
      Number.isInteger(s.index) && s.index >= 0 && s.index < messages.length &&
      ['playing','sorted'].includes(s.status) &&
      s.sorted === s.index + (s.status === 'sorted' ? 1 : 0) &&
      Number.isInteger(s.mistakes) && s.mistakes >= 0;
  }

  function current(s) {
    return valid(s) ? messages[s.order[s.index]] : null;
  }

  function sort(s,bin) {
    const message = current(s);
    if (!message || s.status !== 'playing' || !bins.some(item => item.id === bin)) return false;
    const correct = message.bin === bin;
    s.feedback = {correct,bin,expected:message.bin,clue:message.clue,
      text:correct ? message.why : `Попробуй ещё раз. ${message.clue}`,why:message.why};
    if (correct) {s.sorted++;s.status='sorted';}
    else s.mistakes++;
    return correct;
  }

  function next(s) {
    if (!valid(s) || s.status !== 'sorted') return false;
    s.index++;
    s.feedback=null;
    s.status=s.index === messages.length ? 'complete' : 'playing';
    return true;
  }

  return Object.freeze({bins,messages,create,current,sort,next});
})();
