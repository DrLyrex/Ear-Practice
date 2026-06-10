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

function getUserStorageKey(user) {
  return user && user.uid ? LS_KEY + '_' + user.uid : LS_KEY;
}

function getProgressSnapshot() {
  return {
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
  };
}

function readStoredProgress(key) {
  try {
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function hasProgressData(data) {
  if (!data) return false;
  var dailyTotal = 0;
  Object.keys(data.dailyExercises || {}).forEach(function(day) {
    dailyTotal += Number(data.dailyExercises[day]) || 0;
  });
  return !!(
    Number(data.score) ||
    Number(data.total) ||
    Number(data.bestStreak) ||
    Number(data.dailyStreak) ||
    Number(data.bestDailyStreak) ||
    dailyTotal ||
    (data.historyDots && data.historyDots.length)
  );
}

function newestDate(a, b) {
  if (!a) return b || '';
  if (!b) return a || '';
  return a > b ? a : b;
}

function mergeDailyExercises(a, b) {
  var merged = {};
  [a || {}, b || {}].forEach(function(source) {
    Object.keys(source).forEach(function(day) {
      merged[day] = Math.max(merged[day] || 0, Number(source[day]) || 0);
    });
  });
  return merged;
}

function mergeProgressData(localData, remoteData) {
  if (!hasProgressData(localData)) return remoteData || localData || {};
  if (!hasProgressData(remoteData)) return localData || remoteData || {};

  var preferRemoteSettings = remoteData.total >= localData.total;
  var history = (remoteData.historyDots || []).length >= (localData.historyDots || []).length
    ? remoteData.historyDots
    : localData.historyDots;

  return {
    score:           Math.max(Number(localData.score) || 0, Number(remoteData.score) || 0),
    total:           Math.max(Number(localData.total) || 0, Number(remoteData.total) || 0),
    bestStreak:      Math.max(Number(localData.bestStreak) || 0, Number(remoteData.bestStreak) || 0),
    currentStreak:   Math.max(Number(localData.currentStreak) || 0, Number(remoteData.currentStreak) || 0),
    dailyStreak:     Math.max(Number(localData.dailyStreak) || 0, Number(remoteData.dailyStreak) || 0),
    bestDailyStreak: Math.max(Number(localData.bestDailyStreak) || 0, Number(remoteData.bestDailyStreak) || 0),
    lastPracticeDate: newestDate(localData.lastPracticeDate, remoteData.lastPracticeDate),
    dailyExercises:  mergeDailyExercises(localData.dailyExercises, remoteData.dailyExercises),
    historyDots:     (history || []).slice(-12),
    theme:           (preferRemoteSettings ? remoteData.theme : localData.theme) || state.theme,
    rootSetting:     (preferRemoteSettings ? remoteData.rootSetting : localData.rootSetting) || state.rootSetting,
    activeIntervals: (preferRemoteSettings ? remoteData.activeIntervals : localData.activeIntervals) || localData.activeIntervals || remoteData.activeIntervals,
    activeChords:    (preferRemoteSettings ? remoteData.activeChords : localData.activeChords) || localData.activeChords || remoteData.activeChords,
    activeScales:    (preferRemoteSettings ? remoteData.activeScales : localData.activeScales) || localData.activeScales || remoteData.activeScales,
  };
}

function applyProgressData(data) {
  if (!data) return;
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
}

function saveToLocalStorage() {
  try {
    var snapshot = getProgressSnapshot();
    localStorage.setItem(LS_KEY, JSON.stringify(snapshot));
    if (currentUser && currentUser.uid) {
      localStorage.setItem(getUserStorageKey(currentUser), JSON.stringify(snapshot));
    }
  } catch (e) { /* storage may be unavailable */ }
}

function loadFromLocalStorage() {
  applyProgressData(readStoredProgress(LS_KEY));
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
    await db.collection('users').doc(cred.user.uid).set(Object.assign({
      displayName: name,
      email: email,
      photoDataUrl: '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, getProgressSnapshot()), { merge: true });
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
      showIfExists('authOverlay');
    }
    return;
  }

  auth.onAuthStateChanged(async function (user) {
    currentUser = user;

    if (user) {
      // ── Signed in ──────────────────────────────────────────
      isLoadingProfile = true;
      var savedPhotoDataUrl = '';
      var localUserData = readStoredProgress(getUserStorageKey(user));
      var localGuestData = readStoredProgress(LS_KEY);
      var localData = mergeProgressData(localGuestData, localUserData);
      var needsCloudSave = false;
      try {
        var snap = await db.collection('users').doc(user.uid).get();
        if (snap.exists) {
          var data = snap.data();
          var mergedData = mergeProgressData(localData, data);
          applyProgressData(mergedData);
          savedPhotoDataUrl = data.photoDataUrl || '';
          needsCloudSave = hasProgressData(localData) && JSON.stringify(getProgressSnapshot()) !== JSON.stringify(data);
          buildItemToggles(); buildAnswerGrid(); updateStats(); updateStreakBar();
        } else {
          // First sign-in — create user doc
          applyProgressData(localData);
          await db.collection('users').doc(user.uid).set(Object.assign({
            displayName: user.displayName || 'Musician',
            email: user.email || '',
            photoDataUrl: '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          }, getProgressSnapshot()), { merge: true });
        }
      } catch (e) {
        console.warn('Could not load profile:', e);
        applyProgressData(localData);
      }
      isLoadingProfile = false;
      applyTheme();
      buildItemToggles(); buildAnswerGrid(); updateStats(); updateStreakBar();
      if (updateDailyPractice()) { needsCloudSave = true; }
      saveToLocalStorage();
      if (needsCloudSave) { saveProgress(); }
      updateAccountUI(user, savedPhotoDataUrl);
      hideIfExists('authOverlay');

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
        showIfExists('authOverlay');
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
    await db.collection('users').doc(currentUser.uid).set(getProgressSnapshot(), { merge: true });
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
  var photoURL   = photoOverride || (user && user.photoURL) || '';
  var avatarHTML = photoURL
    ? '<img src="' + photoURL + '" alt="' + name + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
    : initial;

  setHtmlIfExists('topbarAvatar', avatarHTML);
  setHtmlIfExists('dropdownAvatar', avatarHTML);
  setTextIfExists('dropdownName', name);
  setTextIfExists('dropdownEmail', email);
  setDisplayIfExists('sidebarSignInBtn', isSignedIn ? 'none' : 'flex');
  setDisplayIfExists('nav-profile', isSignedIn ? 'flex' : 'none');
  setHtmlIfExists('profileAvatarLg', avatarHTML);
  setTextIfExists('profileDisplayName', name);
  setTextIfExists('profileEmail', email);
  setDisplayIfExists('profileEditBtn', isSignedIn ? 'inline-flex' : 'none');
  setDisplayIfExists('profileSignOutBtn', isSignedIn ? 'inline-flex' : 'none');
  setDisplayIfExists('profileSignInBtn', isSignedIn ? 'none' : 'inline-flex');
  setDisplayIfExists('profileGuestNote', isSignedIn ? 'none' : 'flex');
  setDisplayIfExists('profileAvatarUploadBtn', isSignedIn ? 'flex' : 'none');
  setDisplayIfExists('dangerZonePanel', isSignedIn ? 'block' : 'none');
  setTextIfExists('topbarStreakValue', state.dailyStreak);

  if (user && user.metadata && user.metadata.creationTime) {
    var d = new Date(user.metadata.creationTime);
    setTextIfExists('profileMemberSince', 'Member since ' + d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  } else {
    setTextIfExists('profileMemberSince', '');
  }
  updateProfileStats();
}

function updateProfileStats() {
  var acc = state.total > 0 ? Math.round(state.score / state.total * 100) + '%' : '—';
  setTextIfExists('profileTotalScore', state.score);
  setTextIfExists('profileTotalAnswered', state.total);
  setTextIfExists('profileAccuracy', acc);
  setTextIfExists('profileBestStreak', state.bestStreak);
  setTextIfExists('profileStreakValue', state.dailyStreak);
  setTextIfExists('topbarStreakValue', state.dailyStreak);
  renderDailyExerciseGraph();
}

// ═══════════════════════════════════════════════════════════
//  AUTH MODAL HELPERS
// ═══════════════════════════════════════════════════════════
window.openAuthModal = function () {
  showIfExists('authOverlay');
  switchPanel('panelSignIn');
  closeSidebar();
};

function closeAuthModal() { hideIfExists('authOverlay'); }

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
window.toggleAccountDropdown = function () { var el = document.getElementById('accountDropdown'); if (el) el.classList.toggle('open'); };

function closeAccountDropdown() { var el = document.getElementById('accountDropdown'); if (el) el.classList.remove('open'); }

document.addEventListener('click', function (e) {
  var dd  = document.getElementById('accountDropdown');
  var btn = document.getElementById('topbarAccountBtn');
  if (dd && btn && !dd.contains(e.target) && !btn.contains(e.target)) closeAccountDropdown();
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
    goToPage('home');
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
  var grid=document.getElementById('answerGrid'); if (!grid) return; grid.innerHTML='';
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
  var cont=document.getElementById('itemToggles'); if (!cont) return; cont.innerHTML='';
  var items, activeSet;
  if (state.exercise==='intervals') {
    items=INTERVALS; activeSet=state.activeIntervals;
    setTextIfExists('settingsTitle','Intervals to practice');
  } else if (state.exercise==='chords') {
    items=CHORDS; activeSet=state.activeChords;
    setTextIfExists('settingsTitle','Chords to practice');
  } else {
    items=SCALES; activeSet=state.activeScales;
    setTextIfExists('settingsTitle','Scales to practice');
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
function getDepth() { return document.body.getAttribute('data-depth') || ''; }

window.goToPage = function (page) {
  var depth = getDepth();
  var routes = {
    home: depth + 'index.html',
    about: depth + 'about.html',
    settings: depth + 'settings.html',
    profile: depth + 'profile.html',
    contact: depth + 'contact.html',
    privacy: depth + 'privacy.html',
    terms: depth + 'terms.html',
    intervals: depth + 'intervals.html',
    chords: depth + 'chords.html',
    scales: depth + 'scales.html'
  };
  window.location.href = routes[page] || routes.home;
};
window.showPage = window.goToPage;

function setActiveNav(page) {
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  var nav = document.getElementById('nav-' + (page === 'home' ? 'home' : page));
  if (nav) nav.classList.add('active');
  var mode = document.getElementById('topbarMode');
  if (mode) mode.textContent = page.charAt(0).toUpperCase() + page.slice(1);
}

function setControllerFabVisible(visible) {
  var fab = document.getElementById('joystickFab');
  if (!fab) return;
  if (visible) fab.classList.add('visible');
  else fab.classList.remove('visible');
}

window.initExercisePage = function (ex) {
  document.body.setAttribute('data-page', ex);
  state.exercise = ex;
  state.currentQ = null;
  state.answered = false;
  setActiveNav(ex);
  var tabs = document.getElementById('intervalModeTabs');
  if (tabs) tabs.style.display = ex === 'intervals' ? 'flex' : 'none';
  setControllerFabVisible(ex === 'intervals');
  var settingsTitle = document.getElementById('settingsTitle');
  if (settingsTitle) settingsTitle.textContent = ex.charAt(0).toUpperCase() + ex.slice(1) + ' to practice';
  buildItemToggles();
  buildAnswerGrid();
  updateStats();
  updateStreakBar();
  closeSidebar();
  if (updateDailyPractice()) {
    updateProfileStats();
    clearTimeout(window._saveTimer);
    window._saveTimer = setTimeout(saveProgress, 1500);
  }
};

function setFabBehind(behind) {
  var fab = document.getElementById('joystickFab');
  if (!fab) return;
  if (behind) fab.classList.add('behind');
  else fab.classList.remove('behind');
}
// ═══════════════════════════════════════════════════════════
//  SIDEBAR
// ═══════════════════════════════════════════════════════════
window.openSidebar = function () {
  var sidebar = document.getElementById('sidebar'); var overlay = document.getElementById('overlay');
  if (sidebar) sidebar.classList.add('open');
  if (overlay) overlay.classList.add('open');
  setFabBehind(true);
};
window.closeSidebar = function () {
  var sidebar = document.getElementById('sidebar'); var overlay = document.getElementById('overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
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
  setTextIfExists('score', state.score);
  setTextIfExists('streak', state.currentStreak);
  setTextIfExists('accuracy', state.total>0?Math.round(state.score/state.total*100)+'%':'—');
}

function updateStreakBar() {
  var bar=document.getElementById('streakBar'); if (!bar) return;
  bar.innerHTML='';
  state.historyDots.forEach(function(d){
    var dot=document.createElement('div'); dot.className='streak-dot '+d; bar.appendChild(dot);
  });
}

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
function showIfExists(id) { var el = document.getElementById(id); if (el) el.classList.remove('hidden'); }
function hideIfExists(id) { var el = document.getElementById(id); if (el) el.classList.add('hidden'); }
function setTextIfExists(id, value) { var el = document.getElementById(id); if (el) el.textContent = value; }
function setHtmlIfExists(id, value) { var el = document.getElementById(id); if (el) el.innerHTML = value; }
function setDisplayIfExists(id, value) { var el = document.getElementById(id); if (el) el.style.display = value; }

function initPage() {
  applyTheme();
  var page = document.body.getAttribute('data-page') || 'home';
  setActiveNav(page);
  if (page === 'profile') updateProfileStats();
  if (window.EAR_TRAINER_EXERCISE_ID) initExercisePage(window.EAR_TRAINER_EXERCISE_ID);
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(){
      if (state.theme==='auto') applyTheme();
    });
  }
  initAuthListener();
}

initPage();
