const parties = [
  { id:'s', name:'Socialdemokraterna', short:'S', leader:'Magdalena Andersson', color:'#e8112d', logo:'assets/logo-s.webp', photo:'assets/leader-s.jpg', aliases:['socialdemokraterna','socialdemokratiska arbetarpartiet','s'] },
  { id:'sd', name:'Sverigedemokraterna', short:'SD', leader:'Jimmie Åkesson', color:'#ddb800', logo:'assets/logo-sd.webp', photo:'assets/leader-sd.jpg', aliases:['sverigedemokraterna','sd'] },
  { id:'m', name:'Moderaterna', short:'M', leader:'Ulf Kristersson', color:'#1b75bc', logo:'assets/logo-m.webp', photo:'assets/leader-m.jpg', aliases:['moderaterna','moderata samlingspartiet','m'] },
  { id:'c', name:'Centerpartiet', short:'C', leader:'Elisabeth Thand Ringqvist', color:'#006a44', logo:'assets/logo-c.webp', photo:'assets/leader-c.jpg', aliases:['centerpartiet','centern','c'] },
  { id:'v', name:'Vänsterpartiet', short:'V', leader:'Nooshi Dadgostar', color:'#da291c', logo:'assets/logo-v.webp', photo:'assets/leader-v.jpg', aliases:['vänsterpartiet','vansterpartiet','vänstern','v'] },
  { id:'kd', name:'Kristdemokraterna', short:'KD', leader:'Ebba Busch', color:'#005ea8', logo:'assets/logo-kd.webp', photo:'assets/leader-kd.jpg', aliases:['kristdemokraterna','kd'] },
  { id:'mp', name:'Miljöpartiet', short:'MP', leader:'Amanda Lind & Daniel Helldén', answerLeader:'Amanda Lind och Daniel Helldén', color:'#53a318', logo:'assets/logo-mp.webp', photo:'assets/leader-mp.jpg', aliases:['miljöpartiet','miljopartiet','miljöpartiet de gröna','mp'], leaderAliases:['amanda lind och daniel hellden','daniel hellden och amanda lind','amanda lind daniel hellden','daniel hellden amanda lind'] },
  { id:'l', name:'Liberalerna', short:'L', leader:'Simona Mohamsson', color:'#006ab3', logo:'assets/logo-l.webp', photo:'assets/leader-l.jpg', aliases:['liberalerna','folkpartiet','l'] }
];

const modes = {
  mixed:{ label:'Mixat quiz', types:['photo-party','logo-leader','leader-logo','photo-leader-text','logo-party-text','party-leader-text'] },
  'photo-party':{ label:'Bild → parti', types:['photo-party'] },
  'logo-leader':{ label:'Symbol → partiledare', types:['logo-leader'] },
  'leader-logo':{ label:'Partiledare → symbol', types:['leader-logo'] },
  'photo-leader-text':{ label:'Bild → skriv namn', types:['photo-leader-text'] },
  'logo-party-text':{ label:'Symbol → skriv parti', types:['logo-party-text'] }
};

const $ = id => document.getElementById(id);
const views = { start:$('startView'), quiz:$('quizView'), result:$('resultView') };
let state = { mode:'mixed', questions:[], index:0, score:0, streak:0, topStreak:0, answered:false };

function shuffle(list) {
  const copy = [...list];
  for (let i=copy.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [copy[i],copy[j]]=[copy[j],copy[i]]; }
  return copy;
}

function showView(name) {
  Object.entries(views).forEach(([key,el]) => el.classList.toggle('hidden',key!==name));
  $('app').focus({preventScroll:true});
  window.scrollTo({top:0,behavior:'smooth'});
}

function loadStats() {
  $('totalScore').textContent=localStorage.getItem('rk-total')||'0';
  $('bestStreak').textContent=localStorage.getItem('rk-best')||'0';
}

function buildPartyStrip() {
  $('partyStrip').innerHTML=parties.map(p=>`<div class="mini-party" title="${p.name}"><img src="${p.logo}" alt="${p.name}s symbol"></div>`).join('');
}

function makeQuestions(mode) {
  const types=modes[mode].types;
  const partyOrder=[...shuffle(parties),...shuffle(parties)].slice(0,10);
  return partyOrder.map((party,index)=>({party,type:types[index%types.length]}));
}

function startQuiz(mode) {
  state={mode,questions:makeQuestions(mode),index:0,score:0,streak:0,topStreak:0,answered:false};
  $('modeLabel').textContent=modes[mode].label;
  showView('quiz');
  renderQuestion();
}

function renderQuestion() {
  state.answered=false;
  const q=state.questions[state.index], p=q.party;
  $('questionNumber').textContent=state.index+1;
  $('progressBar').style.width=`${(state.index+1)*10}%`;
  $('quizScore').textContent=state.score*100; $('streak').textContent=state.streak;
  $('feedback').className='feedback hidden'; $('nextButton').classList.add('hidden');
  const stage=$('visualStage');
  let choices=[], choiceKind='text';

  if (q.type==='photo-party') {
    $('questionKicker').textContent='Känn igen partiledaren'; $('questionText').textContent='Vilket parti leder personen?';
    stage.innerHTML=`<img class="leader-photo" src="${p.photo}" alt="Foto av en partiledare">`;
    choices=choiceOptions(p,x=>x.name);
  } else if (q.type==='logo-leader') {
    $('questionKicker').textContent='Känn igen partisymbolen'; $('questionText').textContent='Vem leder det här partiet?';
    stage.innerHTML=`<img class="party-logo" src="${p.logo}" alt="Partisymbol">`;
    choices=choiceOptions(p,x=>x.leader);
  } else if (q.type==='leader-logo') {
    $('questionKicker').textContent='Koppla rätt'; $('questionText').textContent='Vilken partisymbol hör ihop med namnet?';
    stage.innerHTML=`<div class="leader-name-card" style="--party-color:${p.color}"><span>Partiledare</span><strong>${p.leader}</strong></div>`;
    choices=choiceOptions(p,x=>x.name); choiceKind='logo';
  } else if (q.type==='photo-leader-text') {
    $('questionKicker').textContent='Skriv själv'; $('questionText').textContent=p.id==='mp'?'Vad heter Miljöpartiets två språkrör?':'Vad heter partiledaren?';
    stage.innerHTML=`<img class="leader-photo" src="${p.photo}" alt="Foto av en partiledare">`;
    return renderTextInput('Skriv namn här…',value=>leaderMatch(p,value),p.answerLeader||p.leader);
  } else if (q.type==='logo-party-text') {
    $('questionKicker').textContent='Skriv själv'; $('questionText').textContent='Vad heter partiet?';
    stage.innerHTML=`<img class="party-logo" src="${p.logo}" alt="Partisymbol">`;
    return renderTextInput('Skriv partiets namn…',value=>p.aliases.map(normalize).includes(normalize(value)),p.name);
  } else {
    $('questionKicker').textContent='Skriv själv'; $('questionText').textContent=`Vem leder ${p.name}?`;
    stage.innerHTML=`<div class="leader-name-card" style="--party-color:${p.color}"><span>Parti</span><strong>${p.name}</strong></div>`;
    return renderTextInput('Skriv namn här…',value=>leaderMatch(p,value),p.answerLeader||p.leader);
  }
  renderChoices(choices,p,choiceKind);
}

function choiceOptions(correct,labeler) {
  return shuffle([correct,...shuffle(parties.filter(p=>p.id!==correct.id)).slice(0,3)]).map(p=>({party:p,label:labeler(p),correct:p.id===correct.id}));
}

function renderChoices(choices,correctParty,kind) {
  $('answerArea').innerHTML=`<div class="choice-grid">${choices.map((c,i)=>`<button type="button" class="choice" data-correct="${c.correct}" aria-label="${c.label}">${kind==='logo'?`<img src="${c.party.logo}" alt="${c.label}">`:`<span class="letter">${String.fromCharCode(65+i)}</span><span>${c.label}</span>`}</button>`).join('')}</div>`;
  document.querySelectorAll('.choice').forEach(btn=>btn.addEventListener('click',()=>{
    if(state.answered)return;
    const correct=btn.dataset.correct==='true';
    document.querySelectorAll('.choice').forEach(b=>{b.disabled=true;if(b.dataset.correct==='true')b.classList.add('correct')});
    if(!correct)btn.classList.add('wrong');
    finishAnswer(correct,kind==='logo'?correctParty.name:answerForCurrent(correctParty));
  }));
}

function renderTextInput(placeholder,matcher,answer) {
  $('answerArea').innerHTML=`<form class="text-answer" id="answerForm"><label class="sr-only" for="textInput">Ditt svar</label><input id="textInput" autocomplete="off" autocapitalize="words" placeholder="${placeholder}" required><button type="submit">Svara</button></form>`;
  const form=$('answerForm'),input=$('textInput'); setTimeout(()=>input.focus(),30);
  form.addEventListener('submit',event=>{
    event.preventDefault(); if(state.answered||!input.value.trim())return;
    const correct=matcher(input.value); input.disabled=true; form.querySelector('button').disabled=true; input.style.borderColor=correct?'#24a46d':'#df5a5a'; finishAnswer(correct,answer);
  });
}

function answerForCurrent(p) { return state.questions[state.index].type==='logo-leader'?(p.answerLeader||p.leader):p.name; }
function normalize(value) { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' och ').replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim(); }
function leaderMatch(p,value) { return (p.leaderAliases||[p.leader]).map(normalize).includes(normalize(value)); }

function finishAnswer(correct,answer) {
  state.answered=true;
  if(correct){state.score++;state.streak++;state.topStreak=Math.max(state.topStreak,state.streak)}else state.streak=0;
  $('quizScore').textContent=state.score*100; $('streak').textContent=state.streak;
  const feedback=$('feedback'); feedback.className=`feedback ${correct?'good':'bad'}`; feedback.innerHTML=correct?'Rätt! <strong>+100 poäng</strong>':`Inte riktigt. Rätt svar är <strong>${answer}</strong>.`;
  $('nextButton').classList.remove('hidden'); $('nextButton').textContent=state.index===9?'Se resultat →':'Nästa fråga →'; $('nextButton').focus();
}

function nextQuestion() { if(!state.answered)return; if(state.index>=9)return finishQuiz(); state.index++;renderQuestion(); }
function finishQuiz() {
  const earned=state.score*100,total=Number(localStorage.getItem('rk-total')||0)+earned,best=Math.max(Number(localStorage.getItem('rk-best')||0),state.topStreak);
  localStorage.setItem('rk-total',total);localStorage.setItem('rk-best',best);loadStats();
  $('finalScore').textContent=state.score;$('resultPoints').textContent=earned;$('resultStreak').textContent=state.topStreak;
  $('resultTitle').textContent=state.score===10?'Full pott!':state.score>=7?'Snyggt jobbat!':state.score>=4?'Bra kämpat!':'Ett steg närmare!';
  $('resultMessage').textContent=state.score===10?'Du kan alla åtta partierna. Imponerande!':state.score>=7?'Du har riktigt bra koll. En runda till?':'Varje runda gör att namnen och symbolerna fastnar bättre.';
  showView('result');
}

document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>startQuiz(button.dataset.mode)));
$('nextButton').addEventListener('click',nextQuestion);$('retryButton').addEventListener('click',()=>startQuiz(state.mode));$('chooseButton').addEventListener('click',()=>showView('start'));$('backButton').addEventListener('click',()=>showView('start'));$('homeButton').addEventListener('click',()=>showView('start'));
document.addEventListener('keydown',event=>{if(event.key==='Enter'&&state.answered&&!views.quiz.classList.contains('hidden'))nextQuestion()});
buildPartyStrip();loadStats();
