/* game.js
   Puzzle logic:
   - select image from main screen
   - split into exact piece counts (30,50,80) by choosing factor pairs
   - create piece DOM elements (img with background clip)
   - scatter pieces around board (in pieces container)
   - drag & drop (pointer events) with snap when close
   - show transparent ghost image when Show Image toggled
   - timer starts on first move, stop when complete
*/

const IMAGES = [
  "photo_2025-11-23_20-34-14.jpg",
  "photo_2025-11-23_20-34-22.jpg",
  "photo_2025-11-23_20-34-28.jpg"
];

const selectScreen = document.getElementById('screen-select');
const gameScreen = document.getElementById('screen-game');
const thumbs = Array.from(document.querySelectorAll('.thumb'));
const playBtn = document.getElementById('playBtn');
const levelSelect = document.getElementById('levelSelect');

const boardWrap = document.getElementById('boardWrap');
const board = document.getElementById('board');
const ghostCanvas = document.getElementById('ghostCanvas');
const piecesContainer = document.getElementById('piecesContainer');

const shuffleBtn = document.getElementById('shuffleBtn');
const showBtn = document.getElementById('showBtn');
const backBtn = document.getElementById('backBtn');

const timeEl = document.getElementById('time');
const placedEl = document.getElementById('placed');
const totalEl = document.getElementById('total');
const levelLabel = document.getElementById('levelLabel');

const winModal = document.getElementById('winModal');
const finalText = document.getElementById('finalText');
const replayBtn = document.getElementById('replayBtn');
const toSelectBtn = document.getElementById('toSelectBtn');

let selectedFile = IMAGES[0];
let pieceCount = 50;
let rows = 0, cols = 0;
let pieceW = 0, pieceH = 0;
let pieces = []; // {el, index, row, col, placed}
let placedCount = 0;

let timer = null, seconds = 0, timerStarted = false;

// helper: choose divisors rows x cols such that rows*cols == n and rows<=cols and difference minimal
function factorPair(n){
  let best = [1,n];
  for(let r=1;r<=Math.sqrt(n);r++){
    if(n%r===0){
      const c = n/r;
      if((c - r) < (best[1]-best[0])) best = [r,c];
    }
  }
  return best;
}

// select thumbnail
thumbs.forEach(t=>{
  t.addEventListener('click', ()=>{
    thumbs.forEach(x=>x.classList.remove('selected'));
    t.classList.add('selected');
    selectedFile = t.dataset.file;
  });
});

// PLAY button
playBtn.addEventListener('click', ()=>{
  pieceCount = Number(levelSelect.value);
  startGame();
});

// BACK
backBtn.addEventListener('click', ()=>{
  resetGame();
  showSelect();
});

// SHUFFLE
shuffleBtn.addEventListener('click', ()=>{
  shuffleUnplaced();
});

// SHOW IMAGE toggle
let ghostVisible = false;
showBtn.addEventListener('click', ()=>{
  ghostVisible = !ghostVisible;
  ghostCanvas.style.opacity = ghostVisible ? 0.35 : 0;
});

// replay
replayBtn.addEventListener('click', ()=>{
  winModal.classList.add('hidden');
  startGame();
});
toSelectBtn.addEventListener('click', ()=>{
  winModal.classList.add('hidden');
  resetGame();
  showSelect();
});

// timer
function startTimer(){
  if(timerStarted) return;
  timerStarted = true;
  seconds = 0;
  timeEl.textContent = '0s';
  timer = setInterval(()=> {
    seconds++;
    timeEl.textContent = seconds + 's';
  },1000);
}
function stopTimer(){
  if(timer){ clearInterval(timer); timer = null; timerStarted = false; }
}

// show/hide screens
function showSelect(){ selectScreen.classList.remove('hidden'); gameScreen.classList.add('hidden'); }
function showGame(){ selectScreen.classList.add('hidden'); gameScreen.classList.remove('hidden'); }

// reset game state
function resetGame(){
  stopTimer();
  pieces = [];
  placedCount = 0;
  board.innerHTML = '';
  piecesContainer.innerHTML = '';
  ghostCanvas.width = ghostCanvas.height = 0;
  timeEl.textContent = '0s';
  placedEl.textContent = '0';
  totalEl.textContent = '0';
  levelLabel.textContent = '—';
}

// start game
function startGame(){
  resetGame();
  showGame();
  levelLabel.textContent = pieceCount;
  // compute rows/cols
  const pair = factorPair(pieceCount);
  rows = pair[0];
  cols = pair[1];
  // compute piece size based on board inner size (board is square)
  // ensure board actual pixel size:
  const rect = board.getBoundingClientRect();
  const boardSize = Math.min(rect.width, rect.height);
  pieceW = Math.floor(boardSize / cols);
  pieceH = Math.floor(boardSize / rows);
  // set board inner size exactly to grid size
  board.style.width = (pieceW*cols) + 'px';
  board.style.height = (pieceH*rows) + 'px';

  // prepare ghost (show image) canvas
  prepareGhost(boardSize);

  // create pieces
  buildPieces(rows, cols);

  totalEl.textContent = pieces.length;
  placedEl.textContent = placedCount;
  // scatter
  shuffleUnplaced();
}

// prepare semi-transparent ghost image that sits centered over board
function prepareGhost(boardSize){
  const img = new Image();
  img.src = 'images/' + selectedFile;
  img.onload = ()=>{
    ghostCanvas.width = boardSize;
    ghostCanvas.height = boardSize;
    const ctx = ghostCanvas.getContext('2d');
    ctx.clearRect(0,0,ghostCanvas.width, ghostCanvas.height);
    // draw the image fitted to board
    ctx.globalAlpha = 0.9;
    // fit preserving aspect (cover)
    const iw = img.width, ih = img.height;
    let sx=0, sy=0, sw=iw, sh=ih;
    // scale to cover square
    const scale = Math.max(iw/boardSize, ih/boardSize);
    sw = Math.round(boardSize*scale);
    sh = Math.round(boardSize*scale);
    sx = Math.max(0, Math.floor((iw - sw)/2));
    sy = Math.max(0, Math.floor((ih - sh)/2));
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, boardSize, boardSize);
    ctx.globalAlpha = 1;
    // initially hidden (opacity toggled by showBtn)
    ghostCanvas.style.left = (board.getBoundingClientRect().left + board.getBoundingClientRect().width/2) + 'px';
    // position center via CSS already handled
  };
}

// Build piece elements (exact rows*cols pieces)
function buildPieces(rows, cols){
  const img = new Image();
  img.src = 'images/' + selectedFile;
  img.onload = ()=>{
    pieces = [];
    placedCount = 0;
    const total = rows*cols;
    // create an offscreen canvas to draw cropping areas for better image quality when using <img> inside piece
    // We'll use background-position approach with object-fit for each piece with same source
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const idx = r*cols + c;
        const piece = document.createElement('div');
        piece.className = 'piece';
        piece.style.width = pieceW + 'px';
        piece.style.height = pieceH + 'px';
        // use img tag inside piece for better touch behavior
        const imgEl = document.createElement('img');
        imgEl.src = img.src;
        // calculate object-position for cover cropping:
        const xpos = (c / Math.max(1, cols - 1)) * 100;
        const ypos = (r / Math.max(1, rows - 1)) * 100;
        imgEl.style.objectFit = 'cover';
        imgEl.style.objectPosition = `${xpos}% ${ypos}%`;
        imgEl.style.width = (pieceW*cols) + 'px'; // make it large enough and crop via overflow hidden
        imgEl.style.height = (pieceH*rows) + 'px';
        // To crop properly we set negative margin to shift image so piece shows correct segment
        imgEl.style.transform = `translate(${-c*pieceW}px, ${-r*pieceH}px)`;
        imgEl.style.pointerEvents = 'none';

        piece.appendChild(imgEl);
        piece.dataset.row = r;
        piece.dataset.col = c;
        piece.dataset.idx = idx;
        piece.dataset.placed = '0';

        // target position
        piece.targetLeft = c * pieceW;
        piece.targetTop = r * pieceH;

        // initial logical position will be set on shuffle
        pieces.push({el:piece, r, c, idx, placed:false});
        // add pointer handlers
        addPointerDrag(piece);
        // append to DOM in pieces container (scattered area)
        piecesContainer.appendChild(piece);
      }
    }
  };
}

// shuffle unplaced pieces: move them back to piecesContainer and scatter randomly around board area (sides)
function shuffleUnplaced(){
  // move all pieces to container first
  pieces.forEach(p=>{
    if(p.placed){
      // if already placed, we keep in place
      return;
    }
    const el = p.el;
    piecesContainer.appendChild(el);
    el.style.position = 'relative';
    el.style.left = '0';
    el.style.top = '0';
    el.classList.remove('dragging');
  });

  // now scatter: move a copy of unplaced elements into absolute positions around boardWrap
  const wrapRect = boardWrap.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();

  // choose scatter zones: left and right of board inside wrap or top/bottom if narrow
  const leftZone = {
    x1: wrapRect.left + 10,
    x2: boardRect.left - 10 - pieceW,
    y1: wrapRect.top + 10,
    y2: wrapRect.bottom - 10 - pieceH
  };
  const rightZone = {
    x1: boardRect.right + 10,
    x2: wrapRect.right - 10 - pieceW,
    y1: wrapRect.top + 10,
    y2: wrapRect.bottom - 10 - pieceH
  };

  // ensure container positioned relatively for absolute pieces
  boardWrap.style.position = 'relative';

  pieces.forEach(p=>{
    if(p.placed) return;
    const el = p.el;
    // move element into boardWrap for absolute positioning
    boardWrap.appendChild(el);
    el.style.position = 'absolute';
    // pick left or right zone randomly
    const zone = Math.random() < 0.5 ? leftZone : rightZone;
    // if zone invalid (too small), fallback to top/bottom around board
    let randX, randY;
    if(zone.x2 - zone.x1 < 10){
      // top zone
      randX = boardRect.left + Math.random()*(boardRect.width - pieceW);
      randY = wrapRect.top + 10 + Math.random()*(boardRect.top - wrapRect.top - pieceH - 20);
    } else {
      randX = zone.x1 + Math.random()*(zone.x2 - zone.x1);
      randY = zone.y1 + Math.random()*(zone.y2 - zone.y1);
    }
    // convert absolute to boardWrap-relative coords
    const wrapLeft = wrapRect.left;
    const wrapTop = wrapRect.top;
    const leftRel = randX - wrapLeft;
    const topRel = randY - wrapTop;
    el.style.left = Math.round(leftRel) + 'px';
    el.style.top = Math.round(topRel) + 'px';
    el.style.transform = 'rotate(' + (Math.random()*20-10) + 'deg)';
    el.dataset.placed = '0';
  });
  // update counters
  placedEl.textContent = placedCount;
}

// drag & drop via pointer events (works for mouse/touch)
// on move, place element absolutely inside boardWrap
function addPointerDrag(el){
  let startX=0, startY=0, origLeft=0, origTop=0, dragging=false;
  el.style.touchAction = 'none';

  el.addEventListener('pointerdown', (ev)=>{
    ev.preventDefault();
    el.setPointerCapture(ev.pointerId);
    startX = ev.clientX;
    startY = ev.clientY;
    const rect = el.getBoundingClientRect();
    const wrapRect = boardWrap.getBoundingClientRect();
    // convert to boardWrap-relative
    origLeft = rect.left - wrapRect.left;
    origTop = rect.top - wrapRect.top;
    el.style.transition = 'none';
    el.style.transform = 'none';
    el.classList.add('dragging');
    dragging = true;
  });

  document.addEventListener('pointermove', (ev)=>{
    if(!dragging) return;
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    el.style.left = (origLeft + dx) + 'px';
    el.style.top = (origTop + dy) + 'px';
    el.style.position = 'absolute';
  });

  document.addEventListener('pointerup', (ev)=>{
    if(!dragging) return;
    dragging = false;
    el.classList.remove('dragging');
    // snap detection: if element center within threshold of its target inside board
    const wrapRect = boardWrap.getBoundingClientRect();
    const left = parseInt(el.style.left || 0);
    const top = parseInt(el.style.top || 0);
    const centerX = left + pieceW/2;
    const centerY = top + pieceH/2;
    // board top-left relative to wrap
    const boardRect = board.getBoundingClientRect();
    const boardLeftRel = boardRect.left - wrapRect.left;
    const boardTopRel = boardRect.top - wrapRect.top;

    // compute target position relative to wrap
    const targetLeft = el.dataset.col * pieceW + boardLeftRel;
    const targetTop = el.dataset.row * pieceH + boardTopRel;

    const dist = Math.hypot(centerX - (targetLeft + pieceW/2), centerY - (targetTop + pieceH/2));
    const snapThreshold = Math.max(pieceW, pieceH) * 0.35; // within 35% of piece size -> snap

    if(dist <= snapThreshold){
      // snap into board grid
      el.style.left = (boardLeftRel + el.dataset.col*pieceW) + 'px';
      el.style.top = (boardTopRel + el.dataset.row*pieceH) + 'px';
      el.style.position = 'absolute';
      el.dataset.placed = '1';
      // mark placed in pieces array
      const idx = Number(el.dataset.idx);
      const p = pieces.find(x=>x.idx === idx);
      if(p && !p.placed){
        p.placed = true;
        placedCount++;
        placedEl.textContent = placedCount;
      }
      // lock piece (make not draggable) — but allow moving back if needed: keep draggable
      // check win
      checkWin();
    } else {
      // leave where dropped (still absolute)
      el.dataset.placed = '0';
    }
    // start timer on first real move
    if(!timerStarted) startTimer();
  });
}

// check win: all pieces placed true
function checkWin(){
  if(placedCount === pieces.length){
    stopTimer();
    finalText.textContent = `Time — ${seconds}s · Level — ${pieceCount} pieces`;
    winModal.classList.remove('hidden');
    winModal.classList.add('show');
  }
}

// start timer
function startTimer(){ if(timer) clearInterval(timer); timerStarted = true; seconds=0; timeEl.textContent='0s'; timer = setInterval(()=>{ seconds++; timeEl.textContent = seconds + 's'; },1000); }
function stopTimer(){ if(timer){ clearInterval(timer); timer = null; } timerStarted = false; }

// initial rendering: select first thumb visually
(function init(){
  // mark first thumb selected
  thumbs[0].classList.add('selected');
  selectedFile = thumbs[0].dataset.file;
  // set default selectedFile variable
  selectedFile = selectedFile || IMAGES[0];
})();

// expose selectedFile via global variable used in earlier functions
let selectedFile = IMAGES[0];

// IMPORTANT: When user clicks Play, read the highlighted thumb
playBtn.addEventListener('click', ()=>{
  const sel = document.querySelector('.thumb.selected');
  if(sel) selectedFile = sel.dataset.file;
  else selectedFile = IMAGES[0];
  pieceCount = Number(levelSelect.value);
  startGameSequence();
});

// listen thumb clicks to select
thumbs.forEach(t=>{
  t.addEventListener('click', ()=> {
    thumbs.forEach(x=>x.classList.remove('selected'));
    t.classList.add('selected');
  });
});

// orchestrator: build and show pieces then shuffle
function startGameSequence(){
  selectedFile = document.querySelector('.thumb.selected').dataset.file;
  pieceCount = Number(levelSelect.value);
  // compute rows/cols
  const pair = factorPair(pieceCount);
  rows = pair[0]; cols = pair[1];
  // start game
  startGame();
}

// startGame constructs board and pieces then scatters them
function startGame(){
  resetToGameState();
  // compute board size based on CSS rendered size
  const rect = board.getBoundingClientRect();
  const boardSize = Math.min(rect.width, rect.height);
  pieceW = Math.floor(boardSize / cols);
  pieceH = Math.floor(boardSize / rows);
  // fix board to exact grid pixel size
  board.style.width = (pieceW*cols) + 'px';
  board.style.height = (pieceH*rows) + 'px';
  // ghost image prepare
  prepareGhostImage();
  // build pieces
  buildPieces(rows, cols);
  // after DOM creation, shuffle
  setTimeout(()=> shuffleUnplaced(), 120);
}

// show ghost image
function prepareGhostImage(){
  const img = new Image();
  img.src = 'images/' + selectedFile;
  img.onload = ()=>{
    const ctx = ghostCanvas.getContext('2d');
    const rect = board.getBoundingClientRect();
    ghostCanvas.width = rect.width;
    ghostCanvas.height = rect.height;
    ghostCanvas.style.left = board.offsetLeft + 'px';
    ghostCanvas.style.top = board.offsetTop + 'px';
    ctx.clearRect(0,0,ghostCanvas.width, ghostCanvas.height);
    ctx.globalAlpha = 0.9;
    // draw image fitted cover
    ctx.drawImage(img, 0, 0, ghostCanvas.width, ghostCanvas.height);
    ctx.globalAlpha = 1;
    ghostCanvas.style.opacity = ghostVisible ? 0.35 : 0;
  };
}

// reset some state
function resetToGameState(){
  stopTimer();
  timerStarted = false;
  seconds = 0;
  timeEl.textContent = '0s';
  placedCount = 0;
  pieces = [];
  board.innerHTML = '';
  piecesContainer.innerHTML = '';
  ghostCanvas.style.opacity = ghostVisible ? 0.35 : 0;
  levelLabel.textContent = pieceCount;
  placedEl.textContent = 0;
  totalEl.textContent = pieceCount;
}

// factor pair utility (redeclare)
function factorPair(n){
  let best=[1,n];
  for(let r=1;r<=Math.sqrt(n);r++){
    if(n%r===0){
      const c = n/r;
      if((c-r) < (best[1]-best[0])) best=[r,c];
    }
  }
  return best;
}
