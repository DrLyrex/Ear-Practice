const INTERVALS = [
  { name:'min 2nd',     semitones:1,  short:'m2', songs:['Jaws theme','Pink Panther'] },
  { name:'Maj 2nd',     semitones:2,  short:'M2', songs:['Happy Birthday','Silent Night'] },
  { name:'min 3rd',     semitones:3,  short:'m3', songs:['Smoke on the Water','Greensleeves'] },
  { name:'Maj 3rd',     semitones:4,  short:'M3', songs:['When the Saints Go Marching In'] },
  { name:'Perfect 4th', semitones:5,  short:'P4', songs:['Here Comes the Bride','Amazing Grace'] },
  { name:'Tritone',     semitones:6,  short:'TT', songs:['The Simpsons theme','Black Sabbath'] },
  { name:'Perfect 5th', semitones:7,  short:'P5', songs:['Star Wars theme','Twinkle Twinkle'] },
  { name:'min 6th',     semitones:8,  short:'m6', songs:['The Entertainer'] },
  { name:'Maj 6th',     semitones:9,  short:'M6', songs:['My Bonnie Lies Over the Ocean'] },
  { name:'min 7th',     semitones:10, short:'m7', songs:['Somewhere (West Side Story)'] },
  { name:'Maj 7th',     semitones:11, short:'M7', songs:['Take On Me'] },
  { name:'Octave',      semitones:12, short:'P8', songs:['Somewhere Over the Rainbow'] },
];

const CHORDS = [
  { name:'Major',           intervals:[0,4,7],     short:'Maj',  songs:['Happy, bright, resolved'] },
  { name:'Minor',           intervals:[0,3,7],     short:'min',  songs:['Sad, dark, introspective'] },
  { name:'Diminished',      intervals:[0,3,6],     short:'dim',  songs:['Tense, unstable, spooky'] },
  { name:'Augmented',       intervals:[0,4,8],     short:'aug',  songs:['Dreamy, unresolved, eerie'] },
  { name:'Sus2',            intervals:[0,2,7],     short:'sus2', songs:['Open, airy, ambiguous'] },
  { name:'Sus4',            intervals:[0,5,7],     short:'sus4', songs:['Anticipating resolution'] },
  { name:'Major 7th',       intervals:[0,4,7,11], short:'Maj7', songs:['Jazz, romantic, lush'] },
  { name:'Minor 7th',       intervals:[0,3,7,10], short:'min7', songs:['Soulful, smooth, floating'] },
  { name:'Dom 7th',         intervals:[0,4,7,10], short:'7th',  songs:['Bluesy, driving tension'] },
  { name:'Half-dim 7th',    intervals:[0,3,6,10], short:'ø7',   songs:['Dark jazz, unstable'] },
  { name:'Full-dim 7th',    intervals:[0,3,6,9],  short:'°7',   songs:['Very tense, symmetrical'] },
];

const SCALES = [
  { name:'Major',            intervals:[0,2,4,5,7,9,11],   short:'Major',    songs:['Bright, happy, resolved'] },
  { name:'Natural Minor',    intervals:[0,2,3,5,7,8,10],  short:'Nat. Min', songs:['Sad, dark, classical'] },
  { name:'Harmonic Minor',   intervals:[0,2,3,5,7,8,11],  short:'Har. Min', songs:['Middle-eastern, tense'] },
  { name:'Melodic Minor',    intervals:[0,2,3,5,7,9,11],  short:'Mel. Min', songs:['Jazz, smooth ascending'] },
  { name:'Dorian',           intervals:[0,2,3,5,7,9,10],  short:'Dorian',   songs:['Modal, minor with bright 6th'] },
  { name:'Phrygian',         intervals:[0,1,3,5,7,8,10],  short:'Phryg.',   songs:['Spanish, flamenco'] },
  { name:'Lydian',           intervals:[0,2,4,6,7,9,11],  short:'Lydian',   songs:['Dreamy, sci-fi, raised 4th'] },
  { name:'Mixolydian',       intervals:[0,2,4,5,7,9,10],  short:'Mixo.',    songs:['Rock, bluesy major'] },
  { name:'Locrian',          intervals:[0,1,3,5,6,8,10],  short:'Locrian',  songs:['Most dissonant, rarely used'] },
  { name:'Pentatonic Major', intervals:[0,2,4,7,9],        short:'Pent. Maj',songs:['Folk, country, simple'] },
  { name:'Pentatonic Minor', intervals:[0,3,5,7,10],       short:'Pent. Min',songs:['Blues, rock riffs'] },
  { name:'Blues Scale',      intervals:[0,3,5,6,7,10],      short:'Blues',    songs:['Blues, soul, gritty'] },
  { name:'Whole Tone',       intervals:[0,2,4,6,8,10],      short:'W. Tone',  songs:['Impressionistic, dreamy'] },
  { name:'Diminished',       intervals:[0,2,3,5,6,8,9,11], short:'Dim.',     songs:['Tense, symmetric, jazz'] },
];

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

let state = {
  exercise: 'intervals',
  playMode: 'ascending',
  rootSetting: 'random',
  activeIntervals: new Set([4,7,12]),
  activeChords: new Set([0,1,2,3]),
  activeScales: new Set([0,1]),
  score:0, total:0, currentStreak:0,
  historyDots:[],
  showRefs: true,
  currentQ: null,
  answered: false,
  theme: 'auto',
};

// Audio
let audioCtx = null;
let masterGain = null;
function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}
function getMasterGain() {
  getCtx();
  return masterGain;
}
function stopAudio() {
  getMasterGain().gain.setValueAtTime(0, getCtx().currentTime);
  getMasterGain().gain.setValueAtTime(1, getCtx().currentTime + 0.01);
}
function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function noteToMidi(note) {
  const name = note.slice(0,-1), oct = parseInt(note.slice(-1));
  return NOTE_NAMES.indexOf(name) + (oct+1)*12;
}
function midiToName(m) { return NOTE_NAMES[m%12] + (Math.floor(m/12)-1); }

function playTone(freq, startTime, duration, ctx) {
  const mg = ctx.createGain(); mg.connect(getMasterGain());
  const partials = [[1,1.0,3.0],[2,0.6,4.5],[3,0.25,6.0],[4,0.15,8.0],[5,0.08,10.0],[6,0.05,12.0],[7,0.03,15.0]];
  const inh = 0.0004;
  partials.forEach(([mult,rg,dr]) => {
    const f = mult * Math.sqrt(1 + inh*mult*mult);
    const osc = ctx.createOscillator(), env = ctx.createGain();
    osc.connect(env); env.connect(mg);
    osc.type = 'sine'; osc.frequency.value = freq * f;
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(rg*0.28, startTime+0.005);
    env.gain.setTargetAtTime(0, startTime+0.005, 1/dr);
    osc.start(startTime); osc.stop(startTime+duration+1.5);
  });
  const bsz = ctx.sampleRate*0.04;
  const buf = ctx.createBuffer(1,bsz,ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i=0;i<bsz;i++) d[i]=Math.random()*2-1;
  const ns=ctx.createBufferSource(), nf=ctx.createBiquadFilter(), ng=ctx.createGain();
  nf.type='bandpass'; nf.frequency.value=freq*2; nf.Q.value=0.8;
  ns.buffer=buf; ns.connect(nf); nf.connect(ng); ng.connect(mg);
  ng.gain.setValueAtTime(0.06,startTime);
  ng.gain.exponentialRampToValueAtTime(0.0001,startTime+0.04);
  ns.start(startTime); ns.stop(startTime+0.04);
  mg.gain.setValueAtTime(1,startTime);
  mg.gain.setTargetAtTime(0,startTime+duration,0.3);
}

function getRootMidi() {
  if (state.rootSetting==='random') return 48+Math.floor(Math.random()*13);
  return noteToMidi(state.rootSetting);
}

function playIntervalSound(rootMidi, semitones, mode) {
  const ctx=getCtx(), now=ctx.currentTime+0.15;
  const f1=midiToFreq(rootMidi), f2=midiToFreq(rootMidi+semitones);
  if (mode==='harmonic') { playTone(f1,now,1.5,ctx); playTone(f2,now,1.5,ctx); }
  else if (mode==='ascending') { playTone(f1,now,0.9,ctx); playTone(f2,now+0.8,0.9,ctx); }
  else { playTone(f2,now,0.9,ctx); playTone(f1,now+0.8,0.9,ctx); }
}

function playChordSound(rootMidi, intervals) {
  const ctx=getCtx(), now=ctx.currentTime+0.15;
  intervals.forEach((s,i) => playTone(midiToFreq(rootMidi+s), now+i*0.07, 2.5, ctx));
}

function playScaleSound(rootMidi, intervals) {
  const ctx=getCtx(), now=ctx.currentTime+0.15;
  intervals.forEach((s,i) => playTone(midiToFreq(rootMidi+s), now+i*0.22, 0.6, ctx));
  playTone(midiToFreq(rootMidi+12), now+intervals.length*0.22, 0.6, ctx);
}

function playCurrentSound() {
  if (!state.currentQ || !state.currentQ.item || !isCurrentQuestionValid()) nextQuestion();
  if (!state.currentQ || !state.currentQ.item) return;
  stopAudio();
  getCtx().resume().then(() => setTimeout(() => {
    if (!state.currentQ) return;
    const {item, rootMidi} = state.currentQ;
    if (state.exercise==='intervals') playIntervalSound(rootMidi, item.semitones, state.playMode);
    else if (state.exercise==='chords') playChordSound(rootMidi, item.intervals);
    else playScaleSound(rootMidi, item.intervals);
  }, 80));
}

function generateQuestion() {
  let pool, item;
  if (state.exercise==='intervals') {
    pool=[...state.activeIntervals].filter(s=>INTERVALS.some(i=>i.semitones===s));
    if (pool.length<1) {
      state.activeIntervals = new Set([4,7,12]);
      buildItemToggles(); buildAnswerGrid();
      pool=[...state.activeIntervals];
    }
    if (pool.length<1) { document.getElementById('feedbackMsg').textContent='Enable at least 1!'; return null; }
    const key=pool[Math.floor(Math.random()*pool.length)];
    item=INTERVALS.find(i=>i.semitones===key);
    if (!item) { document.getElementById('feedbackMsg').textContent='No interval available'; return null; }
    return { item, rootMidi: getRootMidi(), key };
  } else if (state.exercise==='chords') {
    pool=[...state.activeChords].filter(i=>i>=0&&i<CHORDS.length);
    if (pool.length<1) {
      state.activeChords = new Set([0,1,2,3]);
      buildItemToggles(); buildAnswerGrid();
      pool=[...state.activeChords];
    }
    if (pool.length<1) { document.getElementById('feedbackMsg').textContent='Enable at least 1!'; return null; }
    const key=pool[Math.floor(Math.random()*pool.length)];
    item=CHORDS[key];
    if (!item) { document.getElementById('feedbackMsg').textContent='No chord available'; return null; }
    return { item, rootMidi: getRootMidi(), key };
  } else {
    pool=[...state.activeScales].filter(i=>i>=0&&i<SCALES.length);
    if (pool.length<1) {
      state.activeScales = new Set([0,1]);
      buildItemToggles(); buildAnswerGrid();
      pool=[...state.activeScales];
    }
    if (pool.length<1) { document.getElementById('feedbackMsg').textContent='Enable at least 1!'; return null; }
    const key=pool[Math.floor(Math.random()*pool.length)];
    item=SCALES[key];
    if (!item) { document.getElementById('feedbackMsg').textContent='No scale available'; return null; }
    return { item, rootMidi: getRootMidi(), key };
  }
}

function isCurrentQuestionValid() {
  if (!state.currentQ || !state.currentQ.item) return false;
  const { key } = state.currentQ;
  if (state.exercise==='intervals') return state.activeIntervals.has(key);
  if (state.exercise==='chords') return state.activeChords.has(key);
  return state.activeScales.has(key);
}

function nextQuestion() {
  state.answered=false;
  state.currentQ=generateQuestion();
  if (!state.currentQ) return;

  document.getElementById('answerDisplay').textContent='?';
  document.getElementById('answerDisplay').classList.remove('revealed');
  document.getElementById('feedbackMsg').textContent='';
  document.getElementById('feedbackMsg').className='feedback-msg';
  document.getElementById('referenceSongs').classList.remove('visible');
  document.getElementById('nextBtn').classList.remove('visible');
  document.getElementById('scaleNotesTag').style.display='none';

  const {item,rootMidi}=state.currentQ;
  const rn=midiToName(rootMidi);
  if (state.exercise==='intervals') {
    const tn=midiToName(rootMidi+item.semitones);
    let notesText;
    if (state.playMode==='ascending') notesText=rn+' → '+tn;
    else if (state.playMode==='descending') notesText=tn+' → '+rn;
    else notesText=rn+' + '+tn;
    state.currentQ.notesText = notesText;
    document.getElementById('notesDisplay').textContent='♩ listening...';
  } else if (state.exercise==='chords') {
    document.getElementById('notesDisplay').textContent=rn+' root · '+item.intervals.length+' notes';
  } else {
    document.getElementById('notesDisplay').textContent=rn+' root · '+item.intervals.length+' notes';
  }
  buildAnswerGrid();
}

function checkAnswer(chosenName) {
  if (state.answered||!state.currentQ) return;
  state.answered=true;
  const correct=state.currentQ.item.name===chosenName;
  state.total++;
  if (correct) { state.score++; state.currentStreak++; state.historyDots.push('hit'); }
  else { state.currentStreak=0; state.historyDots.push('miss'); }
  if (state.historyDots.length>10) state.historyDots.shift();

  document.querySelectorAll('.answer-btn').forEach(btn=>{
    btn.disabled=true;
    if (btn.dataset.name===state.currentQ.item.name) btn.classList.add('correct');
    else if (btn.dataset.name===chosenName&&!correct) btn.classList.add('wrong');
  });

  const fb=document.getElementById('feedbackMsg');
  fb.textContent=correct?['Perfect!','Nailed it!','Excellent!','Spot on!'][Math.floor(Math.random()*4)]:'That was '+state.currentQ.item.name;
  fb.className='feedback-msg '+(correct?'correct':'wrong');

  document.getElementById('answerDisplay').textContent=state.currentQ.item.name;
  document.getElementById('answerDisplay').classList.add('revealed');

  // Reveal notes for intervals after answer
  if (state.exercise==='intervals' && state.currentQ.notesText) {
    document.getElementById('notesDisplay').textContent=state.currentQ.notesText;
  }

  if (state.showRefs&&state.currentQ.item.songs) {
    const ref=document.getElementById('referenceSongs');
    ref.textContent='♪ '+state.currentQ.item.songs.join(' · ');
    ref.classList.add('visible');
  }

  if (state.exercise==='scales') {
    const {item,rootMidi}=state.currentQ;
    const names=item.intervals.map(s=>NOTE_NAMES[(rootMidi+s)%12]).join(' – ');
    const tag=document.getElementById('scaleNotesTag');
    tag.textContent=names; tag.style.display='inline-block';
  }

  document.getElementById('nextBtn').classList.add('visible');
  updateStats(); updateStreakBar();
}

function buildAnswerGrid() {
  const grid=document.getElementById('answerGrid'); grid.innerHTML='';
  let items=[];
  if (state.exercise==='intervals')
    items=[...state.activeIntervals].sort((a,b)=>a-b).map(s=>INTERVALS.find(i=>i.semitones===s));
  else if (state.exercise==='chords')
    items=[...state.activeChords].sort((a,b)=>a-b).map(i=>CHORDS[i]);
  else
    items=[...state.activeScales].sort((a,b)=>a-b).map(i=>SCALES[i]);

  items = items.filter(Boolean);

  items.forEach(item=>{
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='answer-btn'; btn.textContent=item.name; btn.dataset.name=item.name;
    btn.onclick=()=>checkAnswer(item.name);
    grid.appendChild(btn);
  });
}

function buildItemToggles() {
  const cont=document.getElementById('itemToggles'); cont.innerHTML='';
  let items, activeSet;
  if (state.exercise==='intervals') {
    items=INTERVALS; activeSet=state.activeIntervals;
    document.getElementById('settingsTitle').textContent='Intervals to practice';
  } else if (state.exercise==='chords') {
    items=CHORDS; activeSet=state.activeChords;
    document.getElementById('settingsTitle').textContent='Chords to practice';
  } else {
    items=SCALES; activeSet=state.activeScales;
    document.getElementById('settingsTitle').textContent='Scales to practice';
  }
  items.forEach((item,idx)=>{
    const key=state.exercise==='intervals'?item.semitones:idx;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='ivt'+(activeSet.has(key)?' active':'');
    btn.textContent=item.short||item.name; btn.title=item.name;
    btn.onclick=()=>{
      if (activeSet.has(key)) { if (activeSet.size>2){activeSet.delete(key);btn.classList.remove('active');} }
      else { activeSet.add(key); btn.classList.add('active'); }
      buildAnswerGrid();
    };
    cont.appendChild(btn);
  });
}

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  if (page === 'home') {
    document.getElementById('page-home').classList.add('active');
    document.getElementById('nav-home').classList.add('active');
    document.getElementById('topbarMode').textContent = 'Home';
    closeSidebar();
  } else if (page === 'about') {
    document.getElementById('page-about').classList.add('active');
    document.getElementById('nav-about').classList.add('active');
    document.getElementById('topbarMode').textContent = 'About';
    closeSidebar();
  } else {
    document.getElementById('page-trainer').classList.add('active');
    switchExercise(page);
  }
}

function switchExercise(ex) {
  document.getElementById('page-trainer').classList.add('active');
  state.exercise=ex; state.currentQ=null; state.answered=false;
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('nav-'+ex).classList.add('active');
  document.getElementById('topbarMode').textContent=ex.charAt(0).toUpperCase()+ex.slice(1);
  document.getElementById('intervalModeTabs').style.display=ex==='intervals'?'flex':'none';
  document.getElementById('answerDisplay').textContent='?';
  document.getElementById('answerDisplay').classList.remove('revealed');
  document.getElementById('notesDisplay').textContent='press play to begin';
  document.getElementById('feedbackMsg').textContent='';
  document.getElementById('feedbackMsg').className='feedback-msg';
  document.getElementById('referenceSongs').classList.remove('visible');
  document.getElementById('nextBtn').classList.remove('visible');
  document.getElementById('scaleNotesTag').style.display='none';
  buildItemToggles(); buildAnswerGrid(); closeSidebar();
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').classList.add('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
}

function setPlayMode(mode, btn) {
  state.playMode=mode;
  document.querySelectorAll('.mode-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  if (state.currentQ) getCtx().resume().then(() => setTimeout(() => playIntervalSound(state.currentQ.rootMidi, state.currentQ.item.semitones, mode), 80));
}

function setRoot(root, btn) {
  state.rootSetting=root;
  document.querySelectorAll('.sidebar-settings .pill-btn[id^="rb-"]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

function toggleRefs() {
  state.showRefs=!state.showRefs;
  document.getElementById('refToggle').classList.toggle('active',state.showRefs);
}

function setTheme(theme, btn) {
  state.theme = theme;
  document.querySelectorAll('.sidebar-settings .pill-btn[id^="theme"]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyTheme();
}

function applyTheme() {
  if (state.theme === 'dark') {
    document.body.classList.remove('white-theme');
  } else if (state.theme === 'white') {
    document.body.classList.add('white-theme');
  } else {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.toggle('white-theme', !isDark);
  }
}

function updateStats() {
  document.getElementById('score').textContent=state.score;
  document.getElementById('streak').textContent=state.currentStreak;
  document.getElementById('accuracy').textContent=state.total>0?Math.round(state.score/state.total*100)+'%':'—';
}

function updateStreakBar() {
  const bar=document.getElementById('streakBar'); bar.innerHTML='';
  state.historyDots.forEach(d=>{
    const dot=document.createElement('div'); dot.className='streak-dot '+d; bar.appendChild(dot);
  });
}

// Initialize
buildItemToggles();
buildAnswerGrid();
updateStats();

// Start on home page
document.getElementById('page-home').classList.add('active');
document.getElementById('nav-home').classList.add('active');
document.getElementById('page-trainer').classList.remove('active');
document.getElementById('nav-intervals').classList.remove('active');
document.getElementById('topbarMode').textContent = 'Home';