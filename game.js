/* Robust game.js
   - safe selection logic for thumbnails
   - Play reads selected thumbnail (fallback to first)
   - supports Shuffle / Show Image / Back
   - snap-to-target on drop
   - timer start on first successful move
   - pointer events for mouse + touch
   NOTE: assumes images are in folder "images/" and thumbnails have class "thumb" with data-file attribute.
*/

(() => {
  // --------- Config / state ----------
  const IMAGE_FOLDER = "images/";
  let selectedFile = null;
  let pieceCount = 50;      // default
  let rows = 0, cols = 0;
  let pieceW = 0, pieceH = 0;
  let pieces = [];          // {el,row,col,idx,placed}
  let placedCount = 0;
  let timer = null, seconds = 0, timerRunning = false;
  let ghostVisible = false;

  // --------- DOM helpers (robust selectors) ----------
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  const thumbs = $$('.thumb'); // expected .thumb elements with data-file
  const playBtn = $('#playBtn') || $('#play-button') || $('#play');
  const levelSelect = $('#levelSelect') || $('#level-select') || $('#level');
  const selectScreen = $('#screen-select') || $('.screen.select') || $('#select-screen');
  const gameScreen = $('#screen-game') || $('#game-screen') || $('#screen-game');
  const shuffleBtn = $('#shuffleBtn') || $('#shuffleBtn') || $('#shuffle');
  const showBtn = $('#showBtn') || $('#showBtn') || $('#show-image');
  const backBtn = $('#backBtn') || $('#backBtn') || $('#back');
  const board = $('#board') || $('#puzzleBoard') || $('.board');
  const boardWrap = $('#boardWrap') || board?.parentElement || document.body;
  const piecesContainer = $('#piecesContainer') || $('#piecesContainer') || $('#pieces-area') || document.createElement('div');
  const ghostCanvas = $('#ghostCanvas') || $('#ghost') || null;

  const timeEl = $('#time') || $('#timeDisplay') || null;
  const placedEl = $('#placed') || $('#placedCount') || null;
  const totalEl = $('#total') || null;
  const levelLabel = $('#levelLabel') || null;

  const winModal = $('#winModal') || $('#win-modal') || null;
  const finalText = $('#finalText') || null;
  const replayBtn = $('#replayBtn') || null;
  const toSelectBtn = $('#toSelectBtn') || null;

  // safety checks
  if (!board) {
    console.error("game.js: can't find board element (#board or #puzzleBoard).");
  }

  // --------- Utility functions ----------
  function $(el) { return typeof el === 'string' ? document.querySelector(el) : el; }
  function $all(sel) { return Array.from(document.querySelectorAll(sel)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function factorPair(n) {
    // choose rows/cols as near-square factors (allow non-exact if prime -> use floor/ceil)
    for (let r = Math.floor(Math.sqrt(n)); r >= 1; r--) {
      if (n % r === 0) return [r, n / r];
    }
    // fallback: approximate rectangle
    const r = Math.floor(Math.sqrt(n));
    return [r, Math.ceil(n / r)];
  }

  // --------- Thumbnail selection logic ----------
  function initThumbs() {
    if (thumbs && thumbs.length) {
      thumbs.forEach((t, idx) => {
        // allow clicking image inside or the .thumb itself
        t.addEventListener('click', () => {
          thumbs.forEach(x => x.classList.remove('selected'));
          t.classList.add('selected');
          const file = t.dataset.file || (t.querySelector && (t.querySelector('img')?.src || t.querySelector('img')?.getAttribute('src')));
          // normalize to image filename (strip domain if absolute)
          selectedFile = normalizeFilePath(file);
        });
      });
      // default select first
      const first = thumbs[0];
      if (first) {
        first.classList.add('selected');
        selectedFile = normalizeFilePath(first.dataset.file || (first.querySelector && first.querySelector('img')?.getAttribute('src')));
      }
    } else {
      console.warn('game.js: no .thumb elements found.');
    }
  }

  function normalizeFilePath(path) {
    if (!path) return null;
    // if it's just filename, add folder; if absolute/relative URL, use as-is
    if (/^https?:\/\//.test(path) || path.startsWith('/')) return path;
    if (path.startsWith('images/')) return path;
    return IMAGE_FOLDER + path;
  }

  // --------- UI wiring ----------
  function initUI() {
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        // if user clicked thumb after load, ensure we get the selected one
        const sel = document.querySelector('.thumb.selected');
        if (sel && sel.dataset.file) selectedFile = normalizeFilePath(sel.dataset.file);
        if (!selectedFile) {
          // fallback to first thumbnail image src if present
          const f = (thumbs[0] && (thumbs[0].dataset.file || thumbs[0].querySelector('img')?.getAttribute('src')));
          selectedFile = normalizeFilePath(f);
        }
        pieceCount = Number(levelSelect?.value) || 50;
        startGame();
      });
    }

    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', () => shuffleUnplaced());
    }

    if (showBtn) {
      showBtn.addEventListener('click', () => {
        ghostVisible = !ghostVisible;
        if (ghostCanvasEl) ghostCanvasEl.style.opacity = ghostVisible ? 0.35 : 0;
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        resetGame();
        // show selection screen if exists
        if (selectScreen) selectScreen.classList.remove('hidden');
        if (gameScreen) gameScreen.classList.add('hidden');
      });
    }

    if (replayBtn) replayBtn.addEventListener('click', () => {
      if (winModal) winModal.classList.add('hidden');
      startGame();
    });
    if (toSelectBtn) toSelectBtn.addEventListener('click', () => {
      if (winModal) winModal.classList.add('hidden');
      resetGame();
      if (selectScreen) selectScreen.classList.remove('hidden');
      if (gameScreen) gameScreen.classList.add('hidden');
    });
  }

  // --------- Board / ghost canvas ----------
  let ghostCanvasEl = ghostCanvas || null;
  function prepareGhostImage() {
    if (!ghostCanvasEl) return;
    const img = new Image();
    img.onload = () => {
      const rect = board.getBoundingClientRect();
      ghostCanvasEl.width = rect.width;
      ghostCanvasEl.height = rect.height;
      ghostCanvasEl.style.position = 'absolute';
      ghostCanvasEl.style.left = `${board.offsetLeft}px`;
      ghostCanvasEl.style.top = `${board.offsetTop}px`;
      const ctx = ghostCanvasEl.getContext('2d');
      ctx.clearRect(0,0,ghostCanvasEl.width, ghostCanvasEl.height);
      // draw cover-fit
      const bw = ghostCanvasEl.width, bh = ghostCanvasEl.height;
      // draw image scaled to cover the board area
      const scale = Math.max(img.width / bw, img.height / bh);
      const sx = Math.max(0, Math.floor((img.width - bw * scale) / 2));
      const sy = Math.max(0, Math.floor((img.height - bh * scale) / 2));
      ctx.drawImage(img, sx, sy, Math.floor(bw * scale), Math.floor(bh * scale), 0, 0, bw, bh);
      ghostCanvasEl.style.opacity = ghostVisible ? 0.35 : 0;
    };
    img.src = selectedFile;
  }

  // --------- Main start/reset flow ----------
  function startGame() {
    // hide select screen and show game screen if available
    if (selectScreen) selectScreen.classList.add('hidden');
    if (gameScreen) gameScreen.classList.remove('hidden');

    resetGameState();
    // compute rows/cols for given pieceCount
    const pair = factorPair(pieceCount);
    rows = pair[0]; cols = pair[1];

    // compute board size
    const rect = board.getBoundingClientRect();
    const boardSize = Math.min(rect.width, rect.height) || 560;
    pieceW = Math.floor(boardSize / cols);
    pieceH = Math.floor(boardSize / rows);
    // set board to exact grid
    board.style.width = `${pieceW * cols}px`;
    board.style.height = `${pieceH * rows}px`;

    // build ghost
    prepareGhostImage();

    // build pieces (rows * cols) but limit to pieceCount if rows*cols > pieceCount
    buildPieces(rows, cols, pieceCount);

    // scatter unplaced pieces
    setTimeout(() => shuffleUnplaced(), 80);
  }

  function resetGameState() {
    stopTimer();
    pieces = [];
    placedCount = 0;
    board.innerHTML = '';
    // clear piecesContainer if exists (we append to boardWrap for absolute scatter)
    if (piecesContainer) piecesContainer.innerHTML = '';
    if (ghostCanvasEl) {
      ghostCanvasEl.style.opacity = 0;
      ghostCanvasEl.width = ghostCanvasEl.height = 0;
    }
    if (placedEl) placedEl.textContent = '0';
    if (totalEl) totalEl.textContent = '0';
    if (levelLabel) levelLabel.textContent = pieceCount;
  }

  // --------- Build pieces ----------
  function buildPieces(rows, cols, limit) {
    const totalSlots = rows * cols;
    const total = Math.min(limit || totalSlots, totalSlots);
    // create pieces array (row-major)
    const img = new Image();
    img.onload = () => {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          if (idx >= total) break;
          const piece = document.createElement('div');
          piece.className = 'piece';
          piece.style.width = `${pieceW}px`;
          piece.style.height = `${pieceH}px`;
          piece.style.position = 'absolute';
          // use image inside piece and shift it so that piece shows correct part
          const imgEl = document.createElement('img');
          imgEl.src = selectedFile;
          imgEl.style.width = `${pieceW * cols}px`;
          imgEl.style.height = `${pieceH * rows}px`;
          imgEl.style.objectFit = 'cover';
          imgEl.style.transform = `translate(${-c * pieceW}px, ${-r * pieceH}px)`;
          imgEl.style.pointerEvents = 'none';
          piece.appendChild(imgEl);

          piece.dataset.row = r;
          piece.dataset.col = c;
          piece.dataset.idx = idx;
          piece.dataset.placed = '0';
          piece.dataset.targetLeft = c * pieceW;
          piece.dataset.targetTop = r * pieceH;

          // place initially at board (we'll move them when scattering)
          piece.style.left = `${c * pieceW}px`;
          piece.style.top = `${r * pieceH}px`;
          board.appendChild(piece);

          // add pointer drag
          attachPointerDrag(piece);

          pieces.push({el: piece, r, c, idx, placed: false});
        }
      }
      if (totalEl) totalEl.textContent = pieces.length;
    };
    img.src = selectedFile;
  }

  // --------- Scattering unplaced pieces ----------
  function shuffleUnplaced() {
    if (!board) return;
    const wrapRect = board.getBoundingClientRect();
    const wrapLeft = wrapRect.left + window.scrollX;
    const wrapTop = wrapRect.top + window.scrollY;
    // scatter zones around board - left, right and bottom if space allows
    const windowW = window.innerWidth, windowH = window.innerHeight;
    pieces.forEach(p => {
      if (p.placed) return; // don't move placed pieces
      const el = p.el;
      // choose random zone: left or right half
      const zone = Math.random() < 0.5 ? 'left' : 'right';
      let left, top;
      if (zone === 'left') {
        left = Math.max(10, wrapLeft - (Math.random()* (wrapLeft - 120)));
        top = wrapTop + Math.random() * Math.max(50, wrapRect.height - pieceH);
      } else {
        left = wrapLeft + wrapRect.width + Math.random() * Math.max(80, (windowW - wrapLeft - wrapRect.width - 120));
        top = wrapTop + Math.random() * Math.max(50, wrapRect.height - pieceH);
      }
      // convert to board-relative (position inside body)
      el.style.left = (left - wrapLeft) + 'px';
      el.style.top = (top - wrapTop) + 'px';
      el.style.position = 'absolute';
      el.style.transform = `rotate(${(Math.random()*20-10)}deg)`;
      el.dataset.placed = '0';
      p.placed = false;
    });
    // update counters
    if (placedEl) placedEl.textContent = placedCount;
  }

  // --------- Pointer drag with snap ----------
  function attachPointerDrag(el) {
    let startX = 0, startY = 0, origLeft = 0, origTop = 0, dragging = false;

    el.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      el.setPointerCapture(ev.pointerId);
      startX = ev.clientX;
      startY = ev.clientY;
      const rect = el.getBoundingClientRect();
      const boardRect = board.getBoundingClientRect();
      origLeft = rect.left - boardRect.left;
      origTop = rect.top - boardRect.top;
      el.style.transition = 'none';
      el.style.zIndex = 9999;
      dragging = true;
      // start timer on first drag
      startTimerIfNeeded();
    });

    document.addEventListener('pointermove', (ev) => {
      if (!dragging) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      el.style.left = (origLeft + dx) + 'px';
      el.style.top = (origTop + dy) + 'px';
    });

    document.addEventListener('pointerup', (ev) => {
      if (!dragging) return;
      dragging = false;
      el.style.zIndex = '';
      // snap test
      snapIfClose(el);
    });
  }

  function snapIfClose(el) {
    const row = Number(el.dataset.row);
    const col = Number(el.dataset.col);
    const targetLeft = col * pieceW;
    const targetTop = row * pieceH;
    const left = parseFloat(el.style.left || 0);
    const top = parseFloat(el.style.top || 0);

    const centerDX = (left + pieceW/2) - (targetLeft + pieceW/2);
    const centerDY = (top + pieceH/2) - (targetTop + pieceH/2);
    const dist = Math.hypot(centerDX, centerDY);
    const threshold = Math.max(pieceW, pieceH) * 0.35;

    if (dist <= threshold) {
      el.style.left = targetLeft + 'px';
      el.style.top = targetTop + 'px';
      el.dataset.placed = '1';
      el.style.transform = 'none';
      // mark in pieces array
      const idx = Number(el.dataset.idx);
      const p = pieces.find(x => x.idx === idx);
      if (p && !p.placed) {
        p.placed = true;
        placedCount++;
        if (placedEl) placedEl.textContent = placedCount;
      }
      checkWin();
    } else {
      // leave as-is (dropped)
      el.dataset.placed = '0';
    }
  }

  // --------- Timer ----------
  function startTimerIfNeeded() {
    if (timerRunning) return;
    timerRunning = true;
    seconds = 0;
    if (timeEl) timeEl.textContent = '0s';
    timer = setInterval(() => {
      seconds++;
      if (timeEl) timeEl.textContent = seconds + 's';
    }, 1000);
  }
  function stopTimer() {
    timerRunning = false;
    if (timer) clearInterval(timer);
    timer = null;
  }

  // --------- Win detection ----------
  function checkWin() {
    if (placedCount >= pieces.length) {
      stopTimer();
      // show win modal if exists or simple alert
      if (finalText) finalText.textContent = `Time — ${seconds}s · Level — ${pieces.length} pieces`;
      if (winModal) {
        winModal.classList.remove('hidden');
      } else {
        alert(`YOU WIN\nTime: ${seconds}s\nPieces: ${pieces.length}`);
      }
    }
  }

  // --------- Init ----------
  let ghostVisibleLocal = false;
  function init() {
    initThumbs();
    initUI();
    // ghost canvas element wrapper if any
    if (ghostCanvasEl) {
      ghostCanvasEl.style.position = 'absolute';
      ghostCanvasEl.style.pointerEvents = 'none';
      ghostCanvasEl.style.opacity = 0;
    }
    // try to set initial selectedFile if not set
    if (!selectedFile && thumbs && thumbs.length) {
      const f = thumbs[0].dataset.file || (thumbs[0].querySelector('img')?.getAttribute('src'));
      selectedFile = normalizeFilePath(f);
      thumbs[0].classList.add('selected');
    }
    // small safety: make board relative for absolute piece positioning
    if (board) board.style.position = 'relative';
  }
  // public
  init();

})();
