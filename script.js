// ═══════════════════════════════════════════════════════════
//  FIREBASE SETUP
//  1. Go to console.firebase.google.com
//  2. Create a project → Add Web App → copy the config below
//  3. Enable Authentication (Email/Password) and Firestore
//
//  The app works WITHOUT Firebase too — progress is saved to
//  localStorage automatically, so guests never lose their scores.
// ═══════════════════════════════════════════════════════════

const firebaseConfig = {
  apiKey:            "AIzaSyBp_EqBVkXUAlsWw0bvkGN4pPjrXO_77t8",
  authDomain:        "ear-trainer-c20fe.firebaseapp.com",
  projectId:         "ear-trainer-c20fe",
  storageBucket:     "ear-trainer-c20fe.firebasestorage.app",
  messagingSenderId: "103741145405",
  appId:             "1:103741145405:web:c22bfc007fb1368b610554",
  measurementId:     "G-95JMZCPSRX",
};

const FIREBASE_CONFIGURED = true;

let auth = null, db = null;

if (FIREBASE_CONFIGURED) {
  try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db   = firebase.firestore();
  } catch (e) {
    console.warn('Firebase init failed — running in localStorage mode:', e);
  }
}

// ═══════════════════════════════════════════════════════════
//  MUSIC DATA
// ═══════════════════════════════════════════════════════════
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
  { name:'Major',        intervals:[0,4,7],     short:'Maj',  songs:['Happy, bright, resolved'] },
  { name:'Minor',        intervals:[0,3,7],     short:'min',  songs:['Sad, dark, introspective'] },
  { name:'Diminished',   intervals:[0,3,6],     short:'dim',  songs:['Tense, unstable, spooky'] },
  { name:'Augmented',    intervals:[0,4,8],     short:'aug',  songs:['Dreamy, unresolved, eerie'] },
  { name:'Sus2',         intervals:[0,2,7],     short:'sus2', songs:['Open, airy, ambiguous'] },
  { name:'Sus4',         intervals:[0,5,7],     short:'sus4', songs:['Anticipating resolution'] },
  { name:'Major 7th',    intervals:[0,4,7,11],  short:'Maj7', songs:['Jazz, romantic, lush'] },
  { name:'Minor 7th',    intervals:[0,3,7,10],  short:'min7', songs:['Soulful, smooth, floating'] },
  { name:'Dom 7th',      intervals:[0,4,7,10],  short:'7th',  songs:['Bluesy, driving tension'] },
  { name:'Half-dim 7th', intervals:[0,3,6,10],  short:'ø7',   songs:['Dark jazz, unstable'] },
  { name:'Full-dim 7th', intervals:[0,3,6,9],   short:'°7',   songs:['Very tense, symmetrical'] },
];

const SCALES = [
  { name:'Major',            intervals:[0,2,4,5,7,9,11],   short:'Major',     songs:['Bright, happy, resolved'] },
  { name:'Natural Minor',    intervals:[0,2,3,5,7,8,10],   short:'Nat. Min',  songs:['Sad, dark, classical'] },
  { name:'Harmonic Minor',   intervals:[0,2,3,5,7,8,11],   short:'Har. Min',  songs:['Middle-eastern, tense'] },
  { name:'Melodic Minor',    intervals:[0,2,3,5,7,9,11],   short:'Mel. Min',  songs:['Jazz, smooth ascending'] },
  { name:'Dorian',           intervals:[0,2,3,5,7,9,10],   short:'Dorian',    songs:['Modal, minor with bright 6th'] },
  { name:'Phrygian',         intervals:[0,1,3,5,7,8,10],   short:'Phryg.',    songs:['Spanish, flamenco'] },
  { name:'Lydian',           intervals:[0,2,4,6,7,9,11],   short:'Lydian',    songs:['Dreamy, sci-fi, raised 4th'] },
  { name:'Mixolydian',       intervals:[0,2,4,5,7,9,10],   short:'Mixo.',     songs:['Rock, bluesy major'] },
  { name:'Locrian',          intervals:[0,1,3,5,6,8,10],   short:'Locrian',   songs:['Most dissonant, rarely used'] },
  { name:'Pentatonic Major', intervals:[0,2,4,7,9],         short:'Pent. Maj', songs:['Folk, country, simple'] },
  { name:'Pentatonic Minor', intervals:[0,3,5,7,10],        short:'Pent. Min', songs:['Blues, rock riffs'] },
  { name:'Blues Scale',      intervals:[0,3,5,6,7,10],      short:'Blues',     songs:['Blues, soul, gritty'] },
  { name:'Whole Tone',       intervals:[0,2,4,6,8,10],      short:'W. Tone',   songs:['Impressionistic, dreamy'] },
  { name:'Diminished',       intervals:[0,2,3,5,6,8,9,11],  short:'Dim.',      songs:['Tense, symmetric, jazz'] },
];

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════
var state = {
  exercise: 'intervals',
  playMode: 'ascending',
  rootSetting: 'random',
  activeIntervals: new Set([4,7,12]),
  activeChords: new Set([0,1,2,3]),
  activeScales: new Set([0,1]),
  score: 0, total: 0, currentStreak: 0, bestStreak: 0,
  dailyStreak: 0, bestDailyStreak: 0, lastPracticeDate: '',
  dailyExercises: {},
  historyDots: [],
  currentQ: null,
  answered: false,
  theme: 'dark',
};

// Current Firebase user (null = guest)
var currentUser = null;
// Flag to skip save loop during initial load
var isLoadingProfile = false;

// ═══════════════════════════════════════════════════════════
//  LOCAL STORAGE — works for guests and as offline fallback
// ═══════════════════════════════════════════════════════════
var LS_KEY = 'earTrainer_v1';

function saveToLocalStorage() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      score:           state.score,
      total:           state.total,
      bestStreak:      state.bestStreak,
      currentStreak:   state.currentStreak,
      dailyStreak:     state.dailyStreak,
      bestDailyStreak: state.bestDailyStreak,
      lastPracticeDate: state.lastPracticeDate,
      dailyExercises:  state.dailyExercises,
      historyDots:     state.historyDots,
      theme:           state.theme,
      rootSetting:     state.rootSetting,
      activeIntervals: [...state.activeIntervals],
      activeChords:    [...state.activeChords],
      activeScales:    [...state.activeScales],
    }));
  } catch (e) { /* storage may be unavailable */ }
}

function loadFromLocalStorage() {
  try {
    var raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    var data = JSON.parse(raw);
    state.score         = data.score         || 0;
    state.total         = data.total         || 0;
    state.bestStreak    = data.bestStreak     || 0;
    state.currentStreak = data.currentStreak || 0;
    state.dailyStreak     = data.dailyStreak     || 0;
    state.bestDailyStreak = data.bestDailyStreak || 0;
    state.lastPracticeDate = data.lastPracticeDate || '';
    state.dailyExercises  = data.dailyExercises || {};
    state.historyDots   = data.historyDots   || [];
    if (data.theme)           { state.theme = data.theme; }
    if (data.rootSetting)     { state.rootSetting = data.rootSetting; }
    if (data.activeIntervals) { state.activeIntervals = new Set(data.activeIntervals); }
    if (data.activeChords)    { state.activeChords    = new Set(data.activeChords); }
    if (data.activeScales)    { state.activeScales    = new Set(data.activeScales); }
  } catch (e) { /* ignore parse errors */ }
}

// ═══════════════════════════════════════════════════════════
//  FIREBASE AUTH ACTIONS
// ═══════════════════════════════════════════════════════════
window.signInEmail = async function () {
  if (!auth) { document.getElementById('siError').textContent = 'Firebase is not configured yet.'; return; }
  var email    = document.getElementById('siEmail').value.trim();
  var password = document.getElementById('siPassword').value;
  var errEl    = document.getElementById('siError');
  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }
  try {
    setSubmitLoading('panelSignIn', true);
    await auth.signInWithEmailAndPassword(email, password);
    closeAuthModal();
  } catch (e) {
    errEl.textContent = friendlyError(e.code);
  } finally {
    setSubmitLoading('panelSignIn', false);
  }
};

window.signUpEmail = async function () {
  if (!auth) { document.getElementById('suError').textContent = 'Firebase is not configured yet.'; return; }
  var name     = document.getElementById('suName').value.trim();
  var email    = document.getElementById('suEmail').value.trim();
  var password = document.getElementById('suPassword').value;
  var errEl    = document.getElementById('suError');
  errEl.textContent = '';
  if (!name || !email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }
  if (password.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }
  try {
    setSubmitLoading('panelSignUp', true);
    var cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: name });
    await db.collection('users').doc(cred.user.uid).set({
      displayName: name,
      email: email,
      photoDataUrl: '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      score: 0, total: 0, bestStreak: 0,
      dailyStreak: 0, bestDailyStreak: 0, lastPracticeDate: '',
      dailyExercises: {},
    });
    closeAuthModal();
  } catch (e) {
    errEl.textContent = friendlyError(e.code);
  } finally {
    setSubmitLoading('panelSignUp', false);
  }
};

window.sendReset = async function () {
  if (!auth) { document.getElementById('rstError').textContent = 'Firebase is not configured yet.'; return; }
  var email  = document.getElementById('rstEmail').value.trim();
  var errEl  = document.getElementById('rstError');
  var succEl = document.getElementById('rstSuccess');
  errEl.textContent = ''; succEl.textContent = '';
  if (!email) { errEl.textContent = 'Enter your email.'; return; }
  try {
    setSubmitLoading('panelReset', true);
    await auth.sendPasswordResetEmail(email);
    succEl.textContent = 'Reset link sent — check your inbox.';
  } catch (e) {
    errEl.textContent = friendlyError(e.code);
  } finally {
    setSubmitLoading('panelReset', false);
  }
};

window.signOut = async function () {
  if (auth) {
    try { await auth.signOut(); } catch (e) { /* ignore */ }
  }
  currentUser = null;
  closeAccountDropdown();
  closeSidebar();
  updateAccountUI(null);
};

// Always works — no Firebase dependency
window.continueAsGuest = function () {
  closeAuthModal();
  try { localStorage.setItem('earTrainer_authSeen', '1'); } catch(e) {}
};

// ═══════════════════════════════════════════════════════════
//  PROFILE PICTURE UPLOAD
// ═══════════════════════════════════════════════════════════

// Resize image to a manageable size and return base64 data URL
function resizeImageToDataUrl(file, maxSize, quality, callback) {
  var reader = new FileReader();
  reader.onload = function (e) {
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement('canvas');
      var w = img.width, h = img.height;
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
        else        { w = Math.round(w * maxSize / h); h = maxSize; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

window.handleProfilePicChange = async function (event) {
  var file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!currentUser || !db) return;

  // Validate type & size (max 5 MB raw — will be compressed)
  if (!file.type.startsWith('image/')) {
    alert('Please choose an image file.');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    alert('Image must be under 5 MB.');
    return;
  }

  // Show a temporary "uploading" state on the avatar
  var avatarEl = document.getElementById('profileAvatarLg');
  var prevHTML = avatarEl.innerHTML;
  avatarEl.innerHTML = '<span style="font-size:0.6rem;color:var(--muted2)">saving…</span>';

  resizeImageToDataUrl(file, 256, 0.82, async function (dataUrl) {
    try {
      // Save to Firestore user doc
      await db.collection('users').doc(currentUser.uid).set(
        { photoDataUrl: dataUrl },
        { merge: true }
      );
      // Update auth profile photoURL (optional, keeps it in sync)
      try { await currentUser.updateProfile({ photoURL: dataUrl }); } catch(e) {}
      // Refresh UI
      updateAccountUI(currentUser, dataUrl);
    } catch (e) {
      console.warn('Could not save profile picture:', e);
      avatarEl.innerHTML = prevHTML;
      alert('Could not save photo. Please try again.');
    }
  });

  // Reset the input so the same file can be re-selected if needed
  event.target.value = '';
};

// ═══════════════════════════════════════════════════════════
//  AUTH STATE LISTENER
// ═══════════════════════════════════════════════════════════
function initAuthListener() {
  if (!auth) {
    loadFromLocalStorage();
    applyTheme();
    buildItemToggles();
    buildAnswerGrid();
    updateStats();
    updateStreakBar();
    updateAccountUI(null);
    var authSeen = false;
    try { authSeen = !!localStorage.getItem('earTrainer_authSeen'); } catch(e) {}
    if (!authSeen) {
      document.getElementById('authOverlay').classList.remove('hidden');
    }
    return;
  }

  auth.onAuthStateChanged(async function (user) {
    currentUser = user;

    if (user) {
      // ── Signed in ──────────────────────────────────────────
      isLoadingProfile = true;
      var savedPhotoDataUrl = '';
      try {
        var snap = await db.collection('users').doc(user.uid).get();
        if (snap.exists) {
          var data = snap.data();
          state.score         = data.score         || 0;
          state.total         = data.total         || 0;
          state.bestStreak    = data.bestStreak     || 0;
          state.dailyStreak     = data.dailyStreak     || 0;
          state.bestDailyStreak = data.bestDailyStreak || 0;
          state.lastPracticeDate = data.lastPracticeDate || '';
          state.dailyExercises  = data.dailyExercises || {};
          state.currentStreak = data.currentStreak || 0;
          state.historyDots   = data.historyDots   || [];
          if (data.theme)           { state.theme = data.theme; applyTheme(); }
          if (data.rootSetting)     { state.rootSetting = data.rootSetting; }
          if (data.activeIntervals) { state.activeIntervals = new Set(data.activeIntervals); }
          if (data.activeChords)    { state.activeChords    = new Set(data.activeChords); }
          if (data.activeScales)    { state.activeScales    = new Set(data.activeScales); }
          savedPhotoDataUrl = data.photoDataUrl || '';
          buildItemToggles(); buildAnswerGrid(); updateStats(); updateStreakBar();
          if (updateDailyPractice()) { saveProgress(); }
        } else {
          // First sign-in — create user doc
          await db.collection('users').doc(user.uid).set({
            displayName: user.displayName || 'Musician',
            email: user.email || '',
            photoDataUrl: '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            score: 0, total: 0, bestStreak: 0,
            dailyStreak: 0, bestDailyStreak: 0, lastPracticeDate: '',
          });
        }
      } catch (e) {
        console.warn('Could not load profile:', e);
      }
      isLoadingProfile = false;
      updateAccountUI(user, savedPhotoDataUrl);
      document.getElementById('authOverlay').classList.add('hidden');

    } else {
      // ── Signed out / guest ─────────────────────────────────
      loadFromLocalStorage();
      applyTheme();
      buildItemToggles();
      buildAnswerGrid();
      if (updateDailyPractice()) { saveProgress(); }
      updateStats();
      updateStreakBar();
      updateAccountUI(null);

      var authSeen = false;
      try { authSeen = !!localStorage.getItem('earTrainer_authSeen'); } catch(e) {}
      if (!authSeen) {
        document.getElementById('authOverlay').classList.remove('hidden');
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════
//  SAVE PROGRESS
// ═══════════════════════════════════════════════════════════
async function saveProgress() {
  saveToLocalStorage();

  if (!currentUser || isLoadingProfile || !db) return;
  try {
    await db.collection('users').doc(currentUser.uid).set({
      score:           state.score,
      total:           state.total,
      bestStreak:      state.bestStreak,
      dailyStreak:     state.dailyStreak,
      bestDailyStreak: state.bestDailyStreak,
      lastPracticeDate: state.lastPracticeDate,
      dailyExercises:  state.dailyExercises,
      currentStreak:   state.currentStreak,
      historyDots:     state.historyDots,
      theme:           state.theme,
      rootSetting:     state.rootSetting,
      activeIntervals: [...state.activeIntervals],
      activeChords:    [...state.activeChords],
      activeScales:    [...state.activeScales],
    }, { merge: true });
  } catch (e) {
    console.warn('Firestore save failed (progress is still in localStorage):', e);
  }
}

function getTodayKey() {
  var d = new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function updateDailyPractice() {
  var today = getTodayKey();
  if (state.lastPracticeDate === today) return false;
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yd = yesterday.getFullYear() + '-' +
    String(yesterday.getMonth() + 1).padStart(2, '0') + '-' +
    String(yesterday.getDate()).padStart(2, '0');
  var yesterdayKey = yd;
  if (state.lastPracticeDate === yesterdayKey) {
    state.dailyStreak = (state.dailyStreak || 0) + 1;
  } else {
    state.dailyStreak = 1;
  }
  state.lastPracticeDate = today;
  if (state.dailyStreak > state.bestDailyStreak) {
    state.bestDailyStreak = state.dailyStreak;
  }
  return true;
}

function recordDailyExercise() {
  var today = getTodayKey();
  state.dailyExercises = state.dailyExercises || {};
  state.dailyExercises[today] = (state.dailyExercises[today] || 0) + 1;
}

function getLast30Days() {
  var days = [];
  var now = new Date();
  for (var i = 29; i >= 0; i--) {
    var d = new Date(now);
    d.setDate(now.getDate() - i);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    var key = y + '-' + m + '-' + day;
    days.push({ key: key, label: m + '-' + day });
  }
  return days;
}

function renderDailyExerciseGraph() {
  var container = document.getElementById('profileExerciseGraph');
  if (!container) return;
  var days = getLast30Days();
  var maxCount = 1;
  var counts = days.map(function(day) {
    var count = state.dailyExercises && state.dailyExercises[day.key] ? state.dailyExercises[day.key] : 0;
    if (count > maxCount) maxCount = count;
    return count;
  });
  container.innerHTML = '';
  var svgNS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 620 240');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.classList.add('profile-graph-svg');
  var width = 620, height = 240;
  var padding = { left: 42, right: 12, top: 18, bottom: 30 };
  var plotWidth = width - padding.left - padding.right;
  var plotHeight = height - padding.top - padding.bottom;
  var stepX = plotWidth / (days.length - 1);
  var points = counts.map(function(count, idx) {
    var x = padding.left + stepX * idx;
    var y = padding.top + plotHeight - (plotHeight * (count / maxCount));
    if (maxCount === 0) y = padding.top + plotHeight;
    return { x: x, y: y, count: count, label: days[idx].label };
  });

  for (var lineIndex = 0; lineIndex <= 4; lineIndex++) {
    var y = padding.top + (plotHeight / 4) * lineIndex;
    var grid = document.createElementNS(svgNS, 'line');
    grid.setAttribute('x1', padding.left);
    grid.setAttribute('y1', y);
    grid.setAttribute('x2', width - padding.right);
    grid.setAttribute('y2', y);
    grid.setAttribute('class', 'profile-graph-grid-line');
    svg.appendChild(grid);
    var yLabel = document.createElementNS(svgNS, 'text');
    yLabel.setAttribute('x', padding.left - 8);
    yLabel.setAttribute('y', y + 4);
    yLabel.setAttribute('text-anchor', 'end');
    yLabel.setAttribute('class', 'profile-graph-label');
    yLabel.textContent = Math.round(maxCount * (4 - lineIndex) / 4);
    svg.appendChild(yLabel);
  }

  var path = document.createElementNS(svgNS, 'path');
  var pathData = points.map(function(point, idx) {
    return (idx === 0 ? 'M' : 'L') + point.x + ' ' + point.y;
  }).join(' ');
  path.setAttribute('d', pathData);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'var(--accent2)');
  path.setAttribute('stroke-width', '3');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);

  points.forEach(function(point, idx) {
    var circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', point.x);
    circle.setAttribute('cy', point.y);
    circle.setAttribute('r', '4');
    circle.setAttribute('class', point.count ? 'profile-graph-point active' : 'profile-graph-point');
    circle.setAttribute('data-count', point.count);
    svg.appendChild(circle);
    if (point.count > 0) {
      var value = document.createElementNS(svgNS, 'text');
      value.setAttribute('x', point.x);
      value.setAttribute('y', point.y - 8);
      value.setAttribute('text-anchor', 'middle');
      value.setAttribute('class', 'profile-graph-value');
      value.textContent = point.count;
      svg.appendChild(value);
    }
  });

  points.forEach(function(point, idx) {
    if (idx % 5 === 0 || idx === points.length - 1) {
      var text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', point.x);
      text.setAttribute('y', height - 8);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'profile-graph-label');
      text.textContent = point.label.replace(/^0/, '');
      svg.appendChild(text);
    }
  });

  container.appendChild(svg);
}

// ═══════════════════════════════════════════════════════════
//  UPDATE ALL ACCOUNT UI ELEMENTS
//  photoOverride: pass a base64 data URL to override user.photoURL
// ═══════════════════════════════════════════════════════════
function updateAccountUI(user, photoOverride) {
  var isSignedIn = !!user;
  var name       = isSignedIn ? (user.displayName || 'Musician') : 'Guest';
  var email      = isSignedIn ? (user.email || '') : 'Not signed in';
  var initial    = name.charAt(0).toUpperCase();
  // Prefer the Firestore base64 photo, then fall back to auth photoURL
  var photoURL   = photoOverride || (user && user.photoURL) || '';

  var avatarHTML = photoURL
    ? '<img src="' + photoURL + '" alt="' + name + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
    : initial;

  // Topbar avatar
  document.getElementById('topbarAvatar').innerHTML = avatarHTML;

  // Dropdown
  document.getElementById('dropdownAvatar').innerHTML = avatarHTML;
  document.getElementById('dropdownName').textContent  = name;
  document.getElementById('dropdownEmail').textContent = email;

  // Sidebar
  document.getElementById('sidebarSignInBtn').style.display  = isSignedIn ? 'none'  : 'flex';
  document.getElementById('nav-profile').style.display       = isSignedIn ? 'flex'  : 'none';

  // Profile page
  document.getElementById('profileAvatarLg').innerHTML     = avatarHTML;
  document.getElementById('profileDisplayName').textContent = name;
  document.getElementById('profileEmail').textContent       = email;
  document.getElementById('profileEditBtn').style.display   = isSignedIn ? 'inline-flex' : 'none';
  document.getElementById('profileSignOutBtn').style.display= isSignedIn ? 'inline-flex' : 'none';
  document.getElementById('profileSignInBtn').style.display = isSignedIn ? 'none' : 'inline-flex';
  document.getElementById('profileGuestNote').style.display = isSignedIn ? 'none' : 'flex';

  // Show / hide the profile picture upload button
  var uploadBtn = document.getElementById('profileAvatarUploadBtn');
  if (uploadBtn) uploadBtn.style.display = isSignedIn ? 'flex' : 'none';

  // Show / hide danger zone in settings
  var dangerZone = document.getElementById('dangerZonePanel');
  if (dangerZone) dangerZone.style.display = isSignedIn ? 'block' : 'none';

  var topbarStreakValue = document.getElementById('topbarStreakValue');
  if (topbarStreakValue) topbarStreakValue.textContent = state.dailyStreak;

  if (user && user.metadata && user.metadata.creationTime) {
    var d = new Date(user.metadata.creationTime);
    document.getElementById('profileMemberSince').textContent =
      'Member since ' + d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } else {
    document.getElementById('profileMemberSince').textContent = '';
  }
  updateProfileStats();
}

function updateProfileStats() {
  var acc = state.total > 0 ? Math.round(state.score / state.total * 100) + '%' : '—';
  document.getElementById('profileTotalScore').textContent    = state.score;
  document.getElementById('profileTotalAnswered').textContent = state.total;
  document.getElementById('profileAccuracy').textContent      = acc;
  document.getElementById('profileBestStreak').textContent    = state.bestStreak;
  var streakBadge = document.getElementById('profileStreakValue');
  if (streakBadge) streakBadge.textContent = state.dailyStreak;
  var topbarStreakEl = document.getElementById('topbarStreakValue');
  if (topbarStreakEl) topbarStreakEl.textContent = state.dailyStreak;
  renderDailyExerciseGraph();
}

// ═══════════════════════════════════════════════════════════
//  AUTH MODAL HELPERS
// ═══════════════════════════════════════════════════════════
window.openAuthModal = function () {
  document.getElementById('authOverlay').classList.remove('hidden');
  switchPanel('panelSignIn');
  closeSidebar();
};

function closeAuthModal() {
  document.getElementById('authOverlay').classList.add('hidden');
}

window.switchPanel = function (panelId) {
  document.querySelectorAll('.auth-panel').forEach(function(p) { p.classList.add('hidden'); });
  var panel = document.getElementById(panelId);
  panel.classList.remove('hidden');
  panel.querySelectorAll('.auth-error, .auth-success').forEach(function(el) { el.textContent = ''; });
};

function setSubmitLoading(panelId, loading) {
  var btn = document.querySelector('#' + panelId + ' .auth-submit');
  if (btn) {
    btn.disabled = loading;
    if (loading) {
      btn.dataset.label = btn.textContent;
      btn.textContent = 'Please wait…';
    } else {
      btn.textContent = btn.dataset.label || btn.textContent;
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  ACCOUNT DROPDOWN TOGGLE
// ═══════════════════════════════════════════════════════════
window.toggleAccountDropdown = function () {
  document.getElementById('accountDropdown').classList.toggle('open');
};

function closeAccountDropdown() {
  document.getElementById('accountDropdown').classList.remove('open');
}

document.addEventListener('click', function (e) {
  var dd  = document.getElementById('accountDropdown');
  var btn = document.getElementById('topbarAccountBtn');
  if (!dd.contains(e.target) && !btn.contains(e.target)) closeAccountDropdown();
});

// ═══════════════════════════════════════════════════════════
//  PROFILE EDIT (display name)
// ═══════════════════════════════════════════════════════════
window.openProfileEdit = function () {
  document.getElementById('profileNameInput').value = (currentUser && currentUser.displayName) || '';
  document.getElementById('profileEditPanel').style.display = 'block';
  document.getElementById('profileEditError').textContent   = '';
  document.getElementById('profileEditSuccess').textContent = '';
};

window.saveDisplayName = async function () {
  var name  = document.getElementById('profileNameInput').value.trim();
  var errEl = document.getElementById('profileEditError');
  var sucEl = document.getElementById('profileEditSuccess');
  errEl.textContent = ''; sucEl.textContent = '';
  if (!name) { errEl.textContent = 'Name cannot be empty.'; return; }
  if (!currentUser || !db) { errEl.textContent = 'Not signed in.'; return; }
  try {
    await currentUser.updateProfile({ displayName: name });
    await db.collection('users').doc(currentUser.uid).set({ displayName: name }, { merge: true });
    sucEl.textContent = 'Name updated!';
    // Re-read the saved photo URL so we don't lose it on refresh
    var snap = await db.collection('users').doc(currentUser.uid).get();
    var photoDataUrl = (snap.exists && snap.data().photoDataUrl) || '';
    updateAccountUI(currentUser, photoDataUrl);
    setTimeout(function() { document.getElementById('profileEditPanel').style.display = 'none'; }, 1200);
  } catch (e) {
    errEl.textContent = 'Could not save. Try again.';
  }
};

// ═══════════════════════════════════════════════════════════
//  DELETE ACCOUNT
// ═══════════════════════════════════════════════════════════
window.confirmDeleteAccount = async function () {
  if (!currentUser || !auth || !db) return;
  var confirmed = window.confirm(
    'Are you sure you want to permanently delete your account?\n\nAll your progress and data will be lost. This cannot be undone.'
  );
  if (!confirmed) return;
  try {
    // Delete Firestore user document first
    await db.collection('users').doc(currentUser.uid).delete();
    // Delete the Firebase Auth account
    await currentUser.delete();
    // Clear local storage and reset UI
    try { localStorage.removeItem(LS_KEY); localStorage.removeItem('earTrainer_authSeen'); } catch(e) {}
    updateAccountUI(null);
    showPage('home');
    alert('Your account has been deleted.');
  } catch (e) {
    if (e.code === 'auth/requires-recent-login') {
      alert('For security, please sign out and sign back in before deleting your account.');
    } else {
      alert('Could not delete account. Please try again.');
      console.warn('Delete account error:', e);
    }
  }
};

// ═══════════════════════════════════════════════════════════
//  ERROR MESSAGES
// ═══════════════════════════════════════════════════════════
function friendlyError(code) {
  var map = {
    'auth/invalid-email':          'Invalid email address.',
    'auth/user-not-found':         'No account found with that email.',
    'auth/wrong-password':         'Incorrect password.',
    'auth/invalid-credential':     'Email or password is incorrect.',
    'auth/email-already-in-use':   'An account with this email already exists.',
    'auth/weak-password':          'Password must be at least 6 characters.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/too-many-requests':      'Too many attempts. Try again later.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

// ═══════════════════════════════════════════════════════════
//  AUDIO ENGINE
// ═══════════════════════════════════════════════════════════
var audioCtx   = null;
var masterGain = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}
function getMasterGain() { getCtx(); return masterGain; }
function stopAudio() {
  getMasterGain().gain.setValueAtTime(0, getCtx().currentTime);
  getMasterGain().gain.setValueAtTime(1, getCtx().currentTime + 0.01);
}
function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function noteToMidi(note) {
  var name = note.slice(0,-1), oct = parseInt(note.slice(-1));
  return NOTE_NAMES.indexOf(name) + (oct+1)*12;
}
function midiToName(m) { return NOTE_NAMES[m%12] + (Math.floor(m/12)-1); }

function playTone(freq, startTime, duration, ctx) {
  var mg = ctx.createGain(); mg.connect(getMasterGain());
  var partials = [[1,1.0,3.0],[2,0.6,4.5],[3,0.25,6.0],[4,0.15,8.0],[5,0.08,10.0],[6,0.05,12.0],[7,0.03,15.0]];
  var inh = 0.0004;
  partials.forEach(function(p) {
    var mult=p[0], rg=p[1], dr=p[2];
    var f   = mult * Math.sqrt(1 + inh*mult*mult);
    var osc = ctx.createOscillator(), env = ctx.createGain();
    osc.connect(env); env.connect(mg);
    osc.type = 'sine'; osc.frequency.value = freq * f;
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(rg*0.28, startTime+0.005);
    env.gain.setTargetAtTime(0, startTime+0.005, 1/dr);
    osc.start(startTime); osc.stop(startTime+duration+1.5);
  });
  var bsz = ctx.sampleRate*0.04;
  var buf  = ctx.createBuffer(1,bsz,ctx.sampleRate);
  var d    = buf.getChannelData(0);
  for (var i=0;i<bsz;i++) d[i]=Math.random()*2-1;
  var ns=ctx.createBufferSource(), nf=ctx.createBiquadFilter(), ng=ctx.createGain();
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
  var ctx=getCtx(), now=ctx.currentTime+0.15;
  var f1=midiToFreq(rootMidi), f2=midiToFreq(rootMidi+semitones);
  if (mode==='harmonic')        { playTone(f1,now,1.5,ctx); playTone(f2,now,1.5,ctx); }
  else if (mode==='ascending')  { playTone(f1,now,0.9,ctx); playTone(f2,now+0.8,0.9,ctx); }
  else                          { playTone(f2,now,0.9,ctx); playTone(f1,now+0.8,0.9,ctx); }
}

function playChordSound(rootMidi, intervals) {
  var ctx=getCtx(), now=ctx.currentTime+0.15;
  intervals.forEach(function(s,i) { playTone(midiToFreq(rootMidi+s), now+i*0.07, 2.5, ctx); });
}

function playScaleSound(rootMidi, intervals) {
  var ctx=getCtx(), now=ctx.currentTime+0.15;
  intervals.forEach(function(s,i) { playTone(midiToFreq(rootMidi+s), now+i*0.22, 0.6, ctx); });
  playTone(midiToFreq(rootMidi+12), now+intervals.length*0.22, 0.6, ctx);
}

window.playCurrentSound = function () {
  if (!state.currentQ || !state.currentQ.item || !isCurrentQuestionValid()) nextQuestion();
  if (!state.currentQ || !state.currentQ.item) return;
  stopAudio();
  getCtx().resume().then(function() {
    setTimeout(function() {
      if (!state.currentQ) return;
      var item = state.currentQ.item, rootMidi = state.currentQ.rootMidi;
      if (state.exercise==='intervals') playIntervalSound(rootMidi, item.semitones, state.playMode);
      else if (state.exercise==='chords') playChordSound(rootMidi, item.intervals);
      else playScaleSound(rootMidi, item.intervals);
    }, 80);
  });
};

// ═══════════════════════════════════════════════════════════
//  QUESTION LOGIC
// ═══════════════════════════════════════════════════════════
function generateQuestion() {
  var pool, item, key;
  if (state.exercise==='intervals') {
    pool=[...state.activeIntervals].filter(function(s){return INTERVALS.some(function(i){return i.semitones===s;});});
    if (pool.length<1) { state.activeIntervals=new Set([4,7,12]); buildItemToggles(); buildAnswerGrid(); pool=[...state.activeIntervals]; }
    if (pool.length<1) { document.getElementById('feedbackMsg').textContent='Enable at least 1!'; return null; }
    key=pool[Math.floor(Math.random()*pool.length)];
    item=INTERVALS.find(function(i){return i.semitones===key;});
    if (!item) { document.getElementById('feedbackMsg').textContent='No interval available'; return null; }
    return { item:item, rootMidi:getRootMidi(), key:key };
  } else if (state.exercise==='chords') {
    pool=[...state.activeChords].filter(function(i){return i>=0&&i<CHORDS.length;});
    if (pool.length<1) { state.activeChords=new Set([0,1,2,3]); buildItemToggles(); buildAnswerGrid(); pool=[...state.activeChords]; }
    if (pool.length<1) { document.getElementById('feedbackMsg').textContent='Enable at least 1!'; return null; }
    key=pool[Math.floor(Math.random()*pool.length)];
    item=CHORDS[key];
    if (!item) { document.getElementById('feedbackMsg').textContent='No chord available'; return null; }
    return { item:item, rootMidi:getRootMidi(), key:key };
  } else {
    pool=[...state.activeScales].filter(function(i){return i>=0&&i<SCALES.length;});
    if (pool.length<1) { state.activeScales=new Set([0,1]); buildItemToggles(); buildAnswerGrid(); pool=[...state.activeScales]; }
    if (pool.length<1) { document.getElementById('feedbackMsg').textContent='Enable at least 1!'; return null; }
    key=pool[Math.floor(Math.random()*pool.length)];
    item=SCALES[key];
    if (!item) { document.getElementById('feedbackMsg').textContent='No scale available'; return null; }
    return { item:item, rootMidi:getRootMidi(), key:key };
  }
}

function isCurrentQuestionValid() {
  if (!state.currentQ || !state.currentQ.item) return false;
  var key = state.currentQ.key;
  if (state.exercise==='intervals') return state.activeIntervals.has(key);
  if (state.exercise==='chords')    return state.activeChords.has(key);
  return state.activeScales.has(key);
}

window.nextQuestion = function () {
  state.answered=false;
  state.currentQ=generateQuestion();
  if (!state.currentQ) return;

  document.getElementById('answerDisplay').textContent='?';
  document.getElementById('answerDisplay').classList.remove('revealed');
  document.getElementById('feedbackMsg').textContent='';
  document.getElementById('feedbackMsg').className='feedback-msg';
  document.getElementById('nextBtn').classList.remove('visible');
  document.getElementById('scaleNotesTag').style.display='none';

  var item=state.currentQ.item, rootMidi=state.currentQ.rootMidi;
  var rn=midiToName(rootMidi);
  if (state.exercise==='intervals') {
    var tn=midiToName(rootMidi+item.semitones);
    var notesText;
    if (state.playMode==='ascending') notesText=rn+' → '+tn;
    else if (state.playMode==='descending') notesText=tn+' → '+rn;
    else notesText=rn+' + '+tn;
    state.currentQ.notesText=notesText;
    document.getElementById('notesDisplay').textContent='♩ listening...';
  } else {
    document.getElementById('notesDisplay').textContent=rn+' root · '+item.intervals.length+' notes';
  }
  buildAnswerGrid();
};

function checkAnswer(chosenName) {
  if (state.answered||!state.currentQ) return;
  updateDailyPractice();
  recordDailyExercise();
  state.answered=true;
  var correct=state.currentQ.item.name===chosenName;
  state.total++;
  if (correct) {
    state.score++; state.currentStreak++;
    if (state.currentStreak > state.bestStreak) state.bestStreak = state.currentStreak;
    state.historyDots.push('hit');
  } else {
    state.currentStreak=0; state.historyDots.push('miss');
  }
  if (state.historyDots.length>10) state.historyDots.shift();

  document.querySelectorAll('.answer-btn').forEach(function(btn) {
    btn.disabled=true;
    if (btn.dataset.name===state.currentQ.item.name) btn.classList.add('correct');
    else if (btn.dataset.name===chosenName&&!correct) btn.classList.add('wrong');
  });

  var fb=document.getElementById('feedbackMsg');
  var praises=['Perfect!','Nailed it!','Excellent!','Spot on!'];
  fb.textContent=correct ? praises[Math.floor(Math.random()*4)] : 'That was '+state.currentQ.item.name;
  fb.className='feedback-msg '+(correct?'correct':'wrong');

  document.getElementById('answerDisplay').textContent=state.currentQ.item.name;
  document.getElementById('answerDisplay').classList.add('revealed');

  if (state.exercise==='intervals' && state.currentQ.notesText) {
    document.getElementById('notesDisplay').textContent=state.currentQ.notesText;
  }
  if (state.exercise==='scales') {
    var scaleItem=state.currentQ.item, scaleRoot=state.currentQ.rootMidi;
    var names=scaleItem.intervals.map(function(s){return NOTE_NAMES[(scaleRoot+s)%12];}).join(' – ');
    var tag=document.getElementById('scaleNotesTag');
    tag.textContent=names; tag.style.display='inline-block';
  }

  document.getElementById('nextBtn').classList.add('visible');
  updateStats(); updateStreakBar(); updateProfileStats();

  clearTimeout(window._saveTimer);
  window._saveTimer = setTimeout(saveProgress, 1500);
}

function buildAnswerGrid() {
  var grid=document.getElementById('answerGrid'); grid.innerHTML='';
  var items=[];
  if (state.exercise==='intervals')
    items=[...state.activeIntervals].sort(function(a,b){return a-b;}).map(function(s){return INTERVALS.find(function(i){return i.semitones===s;});});
  else if (state.exercise==='chords')
    items=[...state.activeChords].sort(function(a,b){return a-b;}).map(function(i){return CHORDS[i];});
  else
    items=[...state.activeScales].sort(function(a,b){return a-b;}).map(function(i){return SCALES[i];});
  items=items.filter(Boolean);
  items.forEach(function(item) {
    var btn=document.createElement('button');
    btn.type='button'; btn.className='answer-btn';
    btn.textContent=item.name; btn.dataset.name=item.name;
    btn.onclick=function(){checkAnswer(item.name);};
    grid.appendChild(btn);
  });
}

function buildItemToggles() {
  var cont=document.getElementById('itemToggles'); cont.innerHTML='';
  var items, activeSet;
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
  items.forEach(function(item, idx) {
    var key=state.exercise==='intervals'?item.semitones:idx;
    var btn=document.createElement('button');
    btn.type='button';
    btn.className='ivt'+(activeSet.has(key)?' active':'');
    btn.textContent=item.short||item.name; btn.title=item.name;
    btn.onclick=function(){
      if (activeSet.has(key)) { if (activeSet.size>2){ activeSet.delete(key); btn.classList.remove('active'); } }
      else { activeSet.add(key); btn.classList.add('active'); }
      buildAnswerGrid();
      clearTimeout(window._saveTimer);
      window._saveTimer = setTimeout(saveProgress, 1500);
    };
    cont.appendChild(btn);
  });
}

// ═══════════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════════
window.showPage = function (page) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  closeAccountDropdown();
  document.body.setAttribute('data-page', page);

  if (page === 'home') {
    document.getElementById('page-home').classList.add('active');
    document.getElementById('nav-home').classList.add('active');
    document.getElementById('topbarMode').textContent = 'Home';
    closeSidebar();
    setControllerFabVisible(false);
  } else if (page === 'about') {
    document.getElementById('page-about').classList.add('active');
    document.getElementById('nav-about').classList.add('active');
    document.getElementById('topbarMode').textContent = 'About';
    closeSidebar();
    setControllerFabVisible(false);
  } else if (page === 'settings') {
    document.getElementById('page-settings').classList.add('active');
    document.getElementById('nav-settings').classList.add('active');
    document.getElementById('topbarMode').textContent = 'Settings';
    closeSidebar();
    setControllerFabVisible(false);
  } else if (page === 'profile') {
    document.getElementById('page-profile').classList.add('active');
    document.getElementById('nav-profile').classList.add('active');
    document.getElementById('topbarMode').textContent = 'Profile';
    updateProfileStats();
    closeSidebar();
    setControllerFabVisible(false);
  } else {
    document.getElementById('page-trainer').classList.add('active');
    switchExercise(page);
  }
};

function setControllerFabVisible(visible) {
  var fab = document.getElementById('joystickFab');
  if (!fab) return;
  if (visible) {
    fab.classList.add('visible');
  } else {
    fab.classList.remove('visible');
  }
}

function switchExercise(ex) {
  document.getElementById('page-trainer').classList.add('active');
  document.body.setAttribute('data-page', ex);
  state.exercise=ex; state.currentQ=null; state.answered=false;
  document.querySelectorAll('.nav-item').forEach(function(n){n.classList.remove('active');});
  document.getElementById('nav-'+ex).classList.add('active');
  document.getElementById('topbarMode').textContent=ex.charAt(0).toUpperCase()+ex.slice(1);
  document.getElementById('intervalModeTabs').style.display=ex==='intervals'?'flex':'none';
  setControllerFabVisible(ex === 'intervals');
  // Safety fallback: ensure FAB is visible after ad closes, even if AdSense delays things
  if (ex === 'intervals') {
    setTimeout(function () {
      setFabBehind(false);
      setControllerFabVisible(true);
    }, 4000);
  }
  document.getElementById('answerDisplay').textContent='?';
  document.getElementById('answerDisplay').classList.remove('revealed');
  document.getElementById('notesDisplay').textContent='press play to begin';
  document.getElementById('feedbackMsg').textContent='';
  document.getElementById('feedbackMsg').className='feedback-msg';
  document.getElementById('nextBtn').classList.remove('visible');
  document.getElementById('scaleNotesTag').style.display='none';
  buildItemToggles(); buildAnswerGrid(); closeSidebar();
  if (updateDailyPractice()) {
    updateProfileStats();
    clearTimeout(window._saveTimer);
    window._saveTimer = setTimeout(saveProgress, 1500);
  }
  showAd();
}

// ═══════════════════════════════════════════════════════════
//  AD SYSTEM
// ═══════════════════════════════════════════════════════════
var AD_DATA = {
  intervals: { icon:'♩', title:'Interval Training',    body:'Listen for the distance between two notes. Sing the interval internally before you answer.' },
  chords:    { icon:'♪', title:'Chord Recognition',    body:'Focus on the overall colour — bright or dark, stable or tense — rather than individual notes.' },
  scales:    { icon:'♫', title:'Scale Identification', body:'Hear the mood of the whole scale. Each mode has a distinct emotional character.' },
};

var adCloseTimer=null, adSkipTimer=null;

function showAd() {
  var ex=state.exercise, data=AD_DATA[ex]||{icon:'♬',title:ex,body:''};
  var container=document.getElementById('adContainer');
  container.innerHTML=
    '<div class="ad-content">' +
    '<button class="ad-close" onclick="closeAd()" aria-label="Close">✕</button>' +
    '<div class="ad-label">Now playing</div>' +
    '<div class="ad-icon">' + data.icon + '</div>' +
    '<div class="ad-title">' + data.title + '</div>' +
    '<div class="ad-body">' + data.body + '</div>' +
    '<div class="ad-slot">' +
    '<ins class="adsbygoogle" style="display:block;width:300px;height:100px;"' +
    ' data-ad-client="ca-pub-9438810281290905" data-ad-slot="auto"' +
    ' data-ad-format="auto" data-full-width-responsive="true"></ins>' +
    '</div>' +
    '<div class="ad-timer-bar"><div class="ad-timer-fill" id="adTimerFill"></div></div>' +
    '<button class="ad-skip" id="adSkipBtn" disabled onclick="closeAd()">Skip in 2s</button>' +
    '</div>';
  container.style.display='flex';
  setFabBehind(true);
  try { (window.adsbygoogle=window.adsbygoogle||[]).push({}); } catch(e) {}
  if (adSkipTimer) clearTimeout(adSkipTimer);
  if (adCloseTimer) clearTimeout(adCloseTimer);
  adSkipTimer=setTimeout(function(){
    var btn=document.getElementById('adSkipBtn');
    if (btn) { btn.disabled=false; btn.textContent='Skip →'; btn.classList.add('ready'); }
  },2000);
  adCloseTimer=setTimeout(closeAd,3000);
}

window.closeAd = function () {
  clearTimeout(adCloseTimer); clearTimeout(adSkipTimer);
  document.getElementById('adContainer').style.display='none';
  setFabBehind(false);
  // Re-show the FAB in case AdSense interfered with the visibility state
  if (state.exercise === 'intervals') setControllerFabVisible(true);
};

// ═══════════════════════════════════════════════════════════
//  SIDEBAR
// ═══════════════════════════════════════════════════════════
window.openSidebar = function () {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').classList.add('open');
  setFabBehind(true);
};
window.closeSidebar = function () {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
  setFabBehind(false);
};

function setFabBehind(behind) {
  var fab = document.getElementById('joystickFab');
  if (!fab) return;
  if (behind) fab.classList.add('behind');
  else fab.classList.remove('behind');
}

// ═══════════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════════
window.setPlayMode = function (mode, btn) {
  state.playMode=mode;
  document.querySelectorAll('.mode-tab').forEach(function(t){t.classList.remove('active');});
  btn.classList.add('active');
  if (state.currentQ) {
    getCtx().resume().then(function(){
      setTimeout(function(){
        playIntervalSound(state.currentQ.rootMidi, state.currentQ.item.semitones, mode);
      }, 80);
    });
  }
};

window.setRoot = function (root, btn) {
  state.rootSetting=root;
  document.querySelectorAll('.pill-btn[id^="rb-"]').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  clearTimeout(window._saveTimer);
  window._saveTimer=setTimeout(saveProgress,1500);
};

window.setTheme = function (theme, btn) {
  state.theme=theme;
  document.querySelectorAll('.pill-btn[id^="theme"]').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  applyTheme();
  clearTimeout(window._saveTimer);
  window._saveTimer=setTimeout(saveProgress,1500);
};

function applyTheme() {
  if (state.theme==='dark') {
    document.body.classList.remove('white-theme');
  } else if (state.theme==='white') {
    document.body.classList.add('white-theme');
  } else {
    var isDark=window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.toggle('white-theme',!isDark);
  }
}

// ═══════════════════════════════════════════════════════════
//  STATS
// ═══════════════════════════════════════════════════════════
function updateStats() {
  document.getElementById('score').textContent   = state.score;
  document.getElementById('streak').textContent  = state.currentStreak;
  document.getElementById('accuracy').textContent= state.total>0?Math.round(state.score/state.total*100)+'%':'—';
}

function updateStreakBar() {
  var bar=document.getElementById('streakBar'); bar.innerHTML='';
  state.historyDots.forEach(function(d){
    var dot=document.createElement('div'); dot.className='streak-dot '+d; bar.appendChild(dot);
  });
}

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
applyTheme();
buildItemToggles();
buildAnswerGrid();
updateStats();
updateStreakBar();

document.getElementById('page-home').classList.add('active');
document.getElementById('nav-home').classList.add('active');
document.getElementById('page-trainer').classList.remove('active');
document.getElementById('nav-intervals').classList.remove('active');
document.getElementById('topbarMode').textContent='Home';

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(){
  if (state.theme==='auto') applyTheme();
});

initAuthListener();
// ═══════════════════════════════════════════════════════════
//  CONTROLLER MODAL
// ═══════════════════════════════════════════════════════════
window.openControllerModal = function () {
  var overlay = document.getElementById('controllerOverlay');
  if (!overlay) return;
  overlay.classList.add('open');
  setFabBehind(true);
  startAlienRain();
};

window.forceCloseControllerModal = function () {
  var overlay = document.getElementById('controllerOverlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  setFabBehind(false);
  stopAlienRain();
};

window.closeControllerModal = function (e) {
  // Only close when clicking the backdrop itself, not the modal
  if (e && e.target !== document.getElementById('controllerOverlay')) return;
  forceCloseControllerModal();
};

// ═══════════════════════════════════════════════════════════
//  ALIEN SHOOTER GAME
// ═══════════════════════════════════════════════════════════
(function () {
  var canvas, ctx, aliens, raf, running = false;

  // ── Game state ──────────────────────────────────────────
  var game = {
    lives: 3,
    score: 0,
    over: false,
    activeAlien: null,   // OBJECT reference (not index) to avoid splice-shift bugs
    locked: false,       // true while waiting for wrong-answer flash to finish
  };

  // ── Intervals available in game (uses site's activeIntervals) ──
  function getGameIntervals() {
    var pool = [];
    state.activeIntervals.forEach(function(s) {
      var found = INTERVALS.find(function(i){ return i.semitones === s; });
      if (found) pool.push(found);
    });
    if (pool.length === 0) pool = INTERVALS.slice(0,4);
    return pool;
  }

  var ALIEN_TYPES = [
    drawAlienNote,
    drawAlienGuitar,
    drawAlienPiano,
    drawAlienRobot,
  ];

  // Helper: outline-only stroke style setup
  function setOutline(ctx, c, width) {
    ctx.strokeStyle = c.body; ctx.lineWidth = width || 2;
    ctx.fillStyle = 'transparent';
  }

  // 🎵 Musical note alien (outline only)
  function drawAlienNote(ctx, c, s) {
    // body = oval note head (outline)
    ctx.strokeStyle = c.body; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 2, 9, 7, -0.3, 0, Math.PI*2); ctx.stroke();
    // stem
    ctx.strokeStyle = c.body; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(8, -18); ctx.stroke();
    // flag (eighth note beam)
    ctx.strokeStyle = c.accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(8,-18); ctx.bezierCurveTo(18,-14,18,-6,8,-8); ctx.stroke();
    // eyes (small outlined circles)
    ctx.strokeStyle = c.eye; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(-3, 1, 2, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(3, 1, 2, 0, Math.PI*2); ctx.stroke();
    // tiny pupils (filled dots)
    ctx.fillStyle = c.eye;
    ctx.beginPath(); ctx.arc(-3, 1.3, 0.7, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(3, 1.3, 0.7, 0, Math.PI*2); ctx.fill();
    // smile
    ctx.strokeStyle = c.accent; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 3, 3, 0.2, Math.PI-0.2); ctx.stroke();
    // antenna with music note tip
    ctx.strokeStyle = c.accent; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-2,-7); ctx.lineTo(-5,-15); ctx.stroke();
    ctx.strokeStyle = c.accent; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(-5,-17,2,1.5,-0.3,0,Math.PI*2); ctx.stroke();
  }

  // 🎸 Guitar alien (outline only)
  function drawAlienGuitar(ctx, c, s) {
    // guitar body outline (figure-8)
    ctx.strokeStyle = c.body; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 6, 8, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -4, 6, 0, Math.PI*2); ctx.stroke();
    // sound hole
    ctx.strokeStyle = c.accent; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 6, 3, 0, Math.PI*2); ctx.stroke();
    // neck
    ctx.strokeStyle = c.body; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-2,-10); ctx.lineTo(-2,-22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2,-10); ctx.lineTo(2,-22); ctx.stroke();
    // headstock
    ctx.strokeStyle = c.body; ctx.lineWidth = 2;
    ctx.beginPath(); roundRect(ctx,-4,-26,8,5,2); ctx.stroke();
    // frets
    ctx.strokeStyle = c.accent; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-2,-13); ctx.lineTo(2,-13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2,-16); ctx.lineTo(2,-16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2,-19); ctx.lineTo(2,-19); ctx.stroke();
    // strings (3 thin lines across body)
    ctx.strokeStyle = c.eye; ctx.lineWidth = 0.8;
    for (var si = -2; si <= 2; si += 2) {
      ctx.beginPath(); ctx.moveTo(si,-10); ctx.lineTo(si,12); ctx.stroke();
    }
    // eyes on upper body
    ctx.strokeStyle = c.eye; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(-3,-3,1.8,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(3,-3,1.8,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle = c.eye;
    ctx.beginPath(); ctx.arc(-3,-3,0.7,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(3,-3,0.7,0,Math.PI*2); ctx.fill();
  }

  // 🎹 Piano key alien (outline only)
  function drawAlienPiano(ctx, c, s) {
    // head (rounded rect outline)
    ctx.strokeStyle = c.body; ctx.lineWidth = 2;
    roundRect(ctx, -12, -12, 24, 22, 4); ctx.stroke();
    // piano keys across face
    ctx.strokeStyle = c.body; ctx.lineWidth = 1.5;
    var keys = [-10,-6,-2,2,6,10];
    for (var ki = 0; ki < keys.length; ki++) {
      ctx.beginPath(); ctx.moveTo(keys[ki], -2); ctx.lineTo(keys[ki], 8); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(-10,8); ctx.lineTo(10,8); ctx.stroke();
    // black keys (small outlined rects)
    ctx.strokeStyle = c.accent; ctx.lineWidth = 1.5;
    var blacks = [-8,-4,4,8];
    for (var bi = 0; bi < blacks.length; bi++) {
      roundRect(ctx, blacks[bi]-1.5, -2, 3, 5, 1); ctx.stroke();
    }
    // eyes above keys
    ctx.strokeStyle = c.eye; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(-5,-7,2,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(5,-7,2,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle = c.eye;
    ctx.beginPath(); ctx.arc(-5,-7,0.8,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(5,-7,0.8,0,Math.PI*2); ctx.fill();
    // antennae with treble clef-ish tips
    ctx.strokeStyle = c.accent; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-5,-12); ctx.lineTo(-8,-20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5,-12); ctx.lineTo(8,-20); ctx.stroke();
    // small circles at tips
    ctx.strokeStyle = c.accent; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(-8,-20,2,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(8,-20,2,0,Math.PI*2); ctx.stroke();
  }

  // 🎧 Headphones alien (outline only)
  function drawAlienRobot(ctx, c, s) {
    // round head outline
    ctx.strokeStyle = c.body; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 2, 11, 0, Math.PI*2); ctx.stroke();
    // headphone band arc
    ctx.strokeStyle = c.accent; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 2, 13, Math.PI, 0, false); ctx.stroke();
    // headphone cups (outlined circles)
    ctx.strokeStyle = c.accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-13, 2, 4, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(13, 2, 4, 0, Math.PI*2); ctx.stroke();
    // inner cup detail
    ctx.strokeStyle = c.accent; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(-13, 2, 2, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(13, 2, 2, 0, Math.PI*2); ctx.stroke();
    // eyes
    ctx.strokeStyle = c.eye; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(-4, 0, 2.2, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(4, 0, 2.2, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = c.eye;
    ctx.beginPath(); ctx.arc(-4, 0.4, 0.9, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, 0.4, 0.9, 0, Math.PI*2); ctx.fill();
    // smile
    ctx.strokeStyle = c.body; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 4, 4, 0.3, Math.PI-0.3); ctx.stroke();
    // musical note on forehead
    ctx.strokeStyle = c.accent; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0,-5,2.5,2,-0.3,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2,-5); ctx.lineTo(2,-10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2,-10); ctx.bezierCurveTo(6,-9,6,-6,2,-7); ctx.stroke();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r, y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x, y+r); ctx.arcTo(x,y,x+r,y,r);
    ctx.closePath();
  }

  // Color palettes pulled from site CSS vars — read at runtime
  function getPalettes() {
    var style = getComputedStyle(document.body);
    var accent  = style.getPropertyValue('--accent').trim()  || '#c8a96e';
    var accent2 = style.getPropertyValue('--accent2').trim() || '#e8c98e';
    var bg      = style.getPropertyValue('--bg').trim()      || '#0d0e10';
    var bg3     = style.getPropertyValue('--bg3').trim()     || '#1c1f25';
    return [
      { body: accent,  eye: accent2, accent: bg3,    bg: bg },
      { body: bg3,     eye: accent,  accent: accent2, bg: bg },
      { body: accent2, eye: bg,      accent: accent,  bg: bg3 },
    ];
  }

  // ── Ship state ───────────────────────────────────────────
  var ship = {
    x: 0,           // set to canvas.width/2 on init
    targetX: 0,     // moves toward active alien
    bobTimer: 0,
    thrustTimer: 0, // flicker engine when moving
  };

  // ── Projectiles (note bullets) ───────────────────────────
  var projectiles = [];  // { x, y, tx, ty, speed, t, done }

  // ── Spawn timing ─────────────────────────────────────────
  var MAX_ALIENS = 5;
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 180; // frames between new aliens (~3s at 60fps)

  // ── Hit radius ───────────────────────────────────────────
  var HIT_RADIUS = 30;

  function randomAlien(palettes) {
    var gameIntervals = getGameIntervals();
    var interval = gameIntervals[Math.floor(Math.random() * gameIntervals.length)];
    var scale = 0.85 + Math.random() * 0.55;
    var drawFn = ALIEN_TYPES[Math.floor(Math.random() * ALIEN_TYPES.length)];
    var palette = palettes[Math.floor(Math.random() * palettes.length)];
    var margin = 40;
    return {
      draw: drawFn,
      palette: palette,
      interval: interval,
      rootMidi: 48 + Math.floor(Math.random() * 13),
      x: margin + Math.random() * (canvas.width - margin * 2),
      y: -50,
      scale: scale,
      speed: 0.35 + Math.random() * 0.55,
      wobble: Math.random() * Math.PI * 2,
      wobbleAmp: 5 + Math.random() * 12,
      wobbleFreq: 0.009 + Math.random() * 0.015,
      rotation: (Math.random() - 0.5) * 0.2,
      state: 'alive',   // 'alive' | 'active' | 'dying' | 'hit-wrong'
      dyingTimer: 0,
      wrongTimer: 0,
      renderX: 0,
      renderY: 0,
    };
  }

  function spawnAlien(palettes) {
    if (aliens.length >= MAX_ALIENS) return;
    var a = randomAlien(palettes);
    a.y = -55;
    aliens.push(a);
  }

  function initCanvas() {
    canvas = document.getElementById('alienCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    canvas.removeEventListener('click', onCanvasClick);
    canvas.addEventListener('click', onCanvasClick);
  }

  function resize() {
    var modal = document.getElementById('controllerModal');
    canvas.width  = modal.offsetWidth;
    canvas.height = modal.offsetHeight;
    ship.x = canvas.width / 2;
    ship.targetX = ship.x;
  }

  function onCanvasClick(e) {
    if (game.over || !running) return;
    if (game.activeAlien !== null || game.locked) return; // quiz open or flash in progress

    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;

    for (var i = 0; i < aliens.length; i++) {
      var a = aliens[i];
      if (a.state !== 'alive') continue;
      var dx = mx - a.renderX, dy = my - a.renderY;
      if (Math.sqrt(dx*dx + dy*dy) < HIT_RADIUS * a.scale) {
        activateAlien(a);  // pass object, not index
        return;
      }
    }
  }

  function activateAlien(a) {
    game.activeAlien = a;    // store object reference, immune to array splice shifts
    a.state = 'active';
    a.frozenX = a.renderX;   // snapshot position so projectile always hits right spot
    a.frozenY = a.renderY;
    ship.targetX = a.renderX;
    ship.thrustTimer = 30;
    getCtx().resume().then(function() {
      playIntervalSound(a.rootMidi, a.interval.semitones, state.playMode || 'ascending');
    });
    showQuizPopup(a);
  }

  function showQuizPopup(a) {
    var gameIntervals = getGameIntervals();
    var choices = [a.interval];
    var others = gameIntervals.filter(function(iv) { return iv.semitones !== a.interval.semitones; });
    for (var i = others.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = others[i]; others[i] = others[j]; others[j] = tmp;
    }
    choices = choices.concat(others.slice(0, Math.min(3, others.length)));
    for (var i = choices.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = choices[i]; choices[i] = choices[j]; choices[j] = tmp;
    }

    var popup  = document.getElementById('alienQuizPopup');
    var btns   = document.getElementById('alienQuizBtns');
    var replay = document.getElementById('alienQuizReplay');
    btns.innerHTML = '';

    replay.onclick = function() {
      if (!game.activeAlien) return;
      getCtx().resume().then(function() {
        playIntervalSound(game.activeAlien.rootMidi, game.activeAlien.interval.semitones, state.playMode || 'ascending');
      });
    };

    choices.forEach(function(iv) {
      var btn = document.createElement('button');
      btn.className = 'quiz-answer-btn';
      btn.textContent = iv.name;
      btn.onclick = function() { submitAnswer(iv.semitones); };
      btns.appendChild(btn);
    });

    popup.classList.add('visible');
  }

  function fireProjectile(fromX, fromY, toX, toY) {
    projectiles.push({
      x: fromX, y: fromY,
      tx: toX,  ty: toY,
      t: 0,     // 0→1 travel progress
      done: false,
    });
  }

  function submitAnswer(semitones) {
    if (!game.activeAlien || game.locked) return;
    var a = game.activeAlien;   // object reference — safe even if array is spliced
    var correct = semitones === a.interval.semitones;

    var btns = document.querySelectorAll('.quiz-answer-btn');
    btns.forEach(function(b) { b.disabled = true; });

    // Always show correct answer highlighted
    btns.forEach(function(b) {
      if (b.textContent === a.interval.name) b.classList.add('correct');
    });
    if (!correct) {
      var chosenIv = INTERVALS.find(function(iv){ return iv.semitones === semitones; });
      if (chosenIv) {
        btns.forEach(function(b) {
          if (b.textContent === chosenIv.name) b.classList.add('wrong');
        });
      }
    }

    game.activeAlien = null; // release immediately so no double-submit

    if (correct) {
      game.score++;
      updateGameHUD();
      hideQuizPopup();

      // Use frozen position so projectile always hits the right alien
      var shipY = canvas.height - 55;
      fireProjectile(ship.x, shipY, a.frozenX || a.renderX, a.frozenY || a.renderY);

      // Kill alien when projectile lands
      setTimeout(function() {
        if (a.state !== 'dying') {
          a.state = 'dying';
          a.dyingTimer = 45;
        }
      }, 380);

    } else {
      game.lives--;
      updateGameHUD();
      game.locked = true;   // block new clicks while flash plays
      a.state = 'hit-wrong';
      a.wrongTimer = 35;

      setTimeout(function() {
        hideQuizPopup();
        if (a.state === 'hit-wrong') a.state = 'alive'; // restore only if still flashing
        game.locked = false;
        if (game.lives <= 0) triggerGameOver();
      }, 750);
    }
  }

  function hideQuizPopup() {
    var popup = document.getElementById('alienQuizPopup');
    if (popup) popup.classList.remove('visible');
  }

  function updateGameHUD() {
    var livesEl = document.getElementById('alienGameLives');
    var scoreEl = document.getElementById('alienGameScore');
    if (livesEl) {
      livesEl.innerHTML = '';
      for (var i = 0; i < 3; i++) {
        var heart = document.createElement('span');
        heart.className = 'life-heart' + (i < game.lives ? ' active' : ' lost');
        heart.textContent = '♥';
        livesEl.appendChild(heart);
      }
    }
    if (scoreEl) scoreEl.textContent = game.score;
  }

  function triggerGameOver() {
    game.over = true;
    game.locked = false;
    game.activeAlien = null;
    hideQuizPopup();
    var over = document.getElementById('alienGameOver');
    if (over) {
      var fs = over.querySelector('.game-over-score');
      if (fs) fs.textContent = game.score;
      over.classList.add('visible');
    }
  }

  function resetGame() {
    game.lives = 3;
    game.score = 0;
    game.over  = false;
    game.activeAlien = null;
    game.locked = false;
    projectiles = [];
    spawnTimer = 0;
    var over = document.getElementById('alienGameOver');
    if (over) over.classList.remove('visible');
    hideQuizPopup();
    updateGameHUD();
  }

  // ── Draw: ship ───────────────────────────────────────────
  function drawShip(x, y, accent, accent2, thrustAmt) {
    ctx.save();
    ctx.translate(x, y);

    // Engine glow / thrust
    if (thrustAmt > 0) {
      var flickLen = 8 + Math.random() * 12 * thrustAmt;
      var grad = ctx.createLinearGradient(0, 0, 0, flickLen + 10);
      grad.addColorStop(0, 'rgba(200,169,110,0.9)');
      grad.addColorStop(1, 'rgba(200,169,110,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-5, 8); ctx.lineTo(-5, 8 + flickLen); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5, 8);  ctx.lineTo(5, 8 + flickLen * 0.8); ctx.stroke();
    }

    // Hull — sleek pointed ship
    ctx.strokeStyle = accent2;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -22);           // nose tip
    ctx.lineTo(12, 10);           // right base
    ctx.lineTo(8, 6);             // right notch in
    ctx.lineTo(0, 10);            // center bottom
    ctx.lineTo(-8, 6);            // left notch in
    ctx.lineTo(-12, 10);          // left base
    ctx.closePath();
    ctx.stroke();

    // Cockpit window
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -4, 4, 6, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Wing accent lines
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-3, 2); ctx.lineTo(-10, 9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3, 2);  ctx.lineTo(10, 9);  ctx.stroke();

    ctx.restore();
  }

  // ── Draw: note projectile ────────────────────────────────
  function drawProjectile(px, py, t) {
    ctx.save();
    ctx.translate(px, py);
    // spin with travel
    ctx.rotate(t * Math.PI * 6);

    var style = getComputedStyle(document.body);
    var accent = style.getPropertyValue('--accent').trim() || '#c8a96e';

    // Musical note shape
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.8;
    // note head
    ctx.beginPath();
    ctx.ellipse(0, 2, 5, 3.5, -0.3, 0, Math.PI*2);
    ctx.stroke();
    // stem
    ctx.beginPath(); ctx.moveTo(4.5, 0); ctx.lineTo(4.5, -10); ctx.stroke();
    // flag
    ctx.beginPath();
    ctx.moveTo(4.5, -10);
    ctx.bezierCurveTo(10, -8, 10, -3, 4.5, -5);
    ctx.stroke();

    // Glow trail
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  // ── Main tick ────────────────────────────────────────────
  function tick(palettes) {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var style = getComputedStyle(document.body);
    var accent  = style.getPropertyValue('--accent').trim()  || '#c8a96e';
    var accent2 = style.getPropertyValue('--accent2').trim() || '#e8c98e';

    // ── Spawn logic ──────────────────────────────────────
    if (!game.over) {
      spawnTimer++;
      if (spawnTimer >= SPAWN_INTERVAL) {
        spawnTimer = 0;
        spawnAlien(palettes);
      }
    }

    // ── Ship movement ────────────────────────────────────
    var shipY = canvas.height - 55;
    var dx = ship.targetX - ship.x;
    ship.x += dx * 0.08;
    ship.bobTimer += 0.04;
    if (ship.thrustTimer > 0) ship.thrustTimer--;
    var thrustAmt = ship.thrustTimer / 30;

    // ── Projectiles ──────────────────────────────────────
    projectiles = projectiles.filter(function(p) { return !p.done; });
    for (var pi = 0; pi < projectiles.length; pi++) {
      var p = projectiles[pi];
      p.t += 0.028; // travel speed (~35 frames to reach target)
      if (p.t >= 1) { p.done = true; continue; }
      // Lerp with slight arc
      var px = p.x + (p.tx - p.x) * p.t;
      var py = p.y + (p.ty - p.y) * p.t - Math.sin(p.t * Math.PI) * 30;
      drawProjectile(px, py, p.t);
    }

    // ── Aliens ──────────────────────────────────────────
    for (var i = 0; i < aliens.length; i++) {
      var a = aliens[i];

      if (a.state === 'dying') {
        a.dyingTimer--;
        if (a.dyingTimer <= 0) { aliens.splice(i, 1); i--; continue; }

        // Explosion burst
        var t = 1 - a.dyingTimer / 45;
        ctx.save();
        ctx.translate(a.renderX, a.renderY);
        // expanding rings
        for (var r = 0; r < 3; r++) {
          var rt = Math.min(1, t * 1.5 - r * 0.15);
          if (rt <= 0) continue;
          ctx.globalAlpha = (1 - rt) * 0.8;
          ctx.strokeStyle = a.palette.accent;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 28 * rt, 0, Math.PI * 2);
          ctx.stroke();
        }
        // flying note fragments
        for (var f = 0; f < 5; f++) {
          var angle = (f / 5) * Math.PI * 2 + t;
          var dist = t * 30;
          var fx = Math.cos(angle) * dist;
          var fy = Math.sin(angle) * dist;
          ctx.globalAlpha = 1 - t;
          ctx.strokeStyle = accent;
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(fx, fy, 3, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
        continue;
      }

      // Move alive aliens
      if (a.state !== 'dying') {
        a.y += a.speed;
        a.wobble += a.wobbleFreq;
      }

      var ax = a.x + Math.sin(a.wobble) * a.wobbleAmp;
      a.renderX = ax;
      a.renderY = a.y;

      ctx.save();
      if (a.state === 'active') {
        ctx.globalAlpha = 1;
        ctx.translate(ax, a.y);
        ctx.rotate(a.rotation);
        ctx.scale(a.scale, a.scale);
        // pulsing glow ring
        var pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.008);
        ctx.strokeStyle = 'rgba(200,169,110,' + (0.4 + 0.4 * pulse) + ')';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, 0, 24 + pulse * 4, 0, Math.PI*2); ctx.stroke();
        a.draw(ctx, a.palette, a.scale);
      } else if (a.state === 'hit-wrong') {
        a.wrongTimer--;
        var flash = (a.wrongTimer % 8) < 4;
        ctx.globalAlpha = flash ? 1 : 0.3;
        ctx.translate(ax, a.y);
        ctx.rotate(a.rotation);
        ctx.scale(a.scale, a.scale);
        // red tint override
        var redPalette = { body: '#dc4646', eye: '#ff8888', accent: '#ff4444', bg: a.palette.bg };
        a.draw(ctx, redPalette, a.scale);
      } else {
        ctx.globalAlpha = 0.9;
        ctx.translate(ax, a.y);
        ctx.rotate(a.rotation);
        ctx.scale(a.scale, a.scale);
        a.draw(ctx, a.palette, a.scale);
      }
      ctx.restore();

      // Fell off bottom — lose a life
      if (!game.over && a.state === 'alive' && a.y > canvas.height + 60) {
        aliens.splice(i, 1); i--;
        game.lives--;
        updateGameHUD();
        if (game.lives <= 0) { triggerGameOver(); break; }
      }
    }

    // ── Draw ship (on top of aliens, below HUD) ──────────
    var bobY = Math.sin(ship.bobTimer) * 3;
    drawShip(ship.x, shipY + bobY, accent, accent2, thrustAmt);

    raf = requestAnimationFrame(function(){ tick(palettes); });
  }

  window.startAlienRain = function () {
    resetGame();
    initCanvas();
    if (!canvas) return;
    var palettes = getPalettes();
    aliens = [];
    // Start with 3 aliens already in flight
    for (var i = 0; i < 3; i++) {
      var a = randomAlien(palettes);
      a.y = 80 + Math.random() * (canvas.height * 0.5);
      aliens.push(a);
    }
    ship.x = canvas.width / 2;
    ship.targetX = canvas.width / 2;
    running = true;
    cancelAnimationFrame(raf);
    tick(palettes);
    updateGameHUD();
  };

  window.stopAlienRain = function () {
    running = false;
    cancelAnimationFrame(raf);
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hideQuizPopup();
    game.activeAlien = null;
    game.locked = false;
    projectiles = [];
    var over = document.getElementById('alienGameOver');
    if (over) over.classList.remove('visible');
  };
})();