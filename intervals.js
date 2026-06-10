var INTERVALS = [
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
window.EAR_TRAINER_EXERCISE_ID = 'intervals';

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
