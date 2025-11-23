/* script.js — Purple Matrix puzzle
   Использует твои 3 файла, лежащие в images/
*/

const imageFiles = [
  "photo_2025-11-23_20-34-14.jpg",
  "photo_2025-11-23_20-34-22.jpg",
  "photo_2025-11-23_20-34-28.jpg"
];

// DOM
const intro = document.getElementById('intro');
const enterBtn = document.getElementById('enterBtn');
const matrixCanvas = document.getElementById('matrixCanvas');

const app = document.getElementById('app');
const thumbsEl = document.getElementById('thumbs');
const selectedPreview = document.getElementById('selectedPreview');
const selTitle = document.getElementById('selTitle');
const selDesc = document.getElementById('selDesc');

const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const solveBtn = document.getElementById('solveBtn');
const previewBtn = document.getElementById('previewBtn');

const board = document.getElementById('board');
const tray = document.getElementById('tray');
const modeSel = document.getElementById('mode');

const movesEl = document.getElementById('moves');
const timeEl = document.getElementById('time');
const piecesCountEl = document.getElementById('piecesCount');

const overlay = document.getElementById('overlay');
const resTitle = document.getElementById('resTitle');
const resText = document.getElementById('resText');
const playAgain = document.getElementById('playAgain');

let selectedImage = imageFiles[0];
let grid = Number(modeSel.value);
let timer = null, seconds = 0, moves = 0;
let solved = false;

// --- Animated intro matrix effect (subtle) ---
(function matrixEffect(){
  const c = matrixCanvas;
  const ctx = c.getContext('2d');
  function fit(){ c.width = window.innerWidth; c.height = window.innerHeight; }
  fit(); window.addEventListener('resize', fit);
  const cols = Math.floor(c.width / 14);
  const chars = "01";
  const drops = new Array(cols).fill(0).map(()=>Math.random()*c.height);
  function draw(){
    ctx.fillStyle = "rgba(5,3,10,0.12)";
    ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle = "rgba(140,90,255,0.06)";
    ctx.font = "12px monospace";
    for(let i=0;i<cols;i++){
      const text = chars.charAt(Math.floor(Math.random()*chars.length));
      const x = i*14;
      ctx.fillText(text, x, drops[i]);
      drops[i] += 12 + Math.random()*6;
      if(drops[i] > c.height) drops[i] = -20;
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

// --- UI init ---
function renderThumbs(){
  thumbsEl.innerHTML = '';
  imageFiles.forEach((f,i)=>{
    const el = document.createElement('div');
    el.className = 'thumb';
    el.innerHTML = `<img src="images/${f}" alt="${f}">`;
    el.addEventListener('click', ()=> selectImage(f, el));
    thumbsEl.appendChild(el);
  });
  // select first
  selectImage(selectedImage, thumbsEl.children[0]);
}

function selectImage(fname, el){
  selectedImage = fname;
  // highlight
  Array.from(thumbsEl.children).forEach(ch => ch.classList.remove('selected'));
  if(el) el.classList.add('selected');
  selectedPreview.src = `images/${fname}`;
  selTitle.textContent = fname;
  selDesc.textContent = 'Готово — жми Start';
}

// Intro -> App transition
function showApp(){
  intro.classList.add('hidden');
  app.classList.remove('hidden');
}
enterBtn.addEventListener('click', ()=> {
  // animated intro disappear
  intro.classList.add('hidden');
  app.classList.remove('hidden');
});
document.addEventListener('keydown', (e)=> { if(e.key==='Enter') enterBtn.click(); });

// --- Puzzle core (drag & drop tiles into slots) ---
function startPuzzle(){
  grid = Number(modeSel.value);
  board.innerHTML = '';
  tray.innerHTML = '';
  moves = 0; seconds = 0; movesEl.textContent = '0'; timeEl.textContent = '0s'; piecesCountEl.textContent = (grid*grid);
  solved = false; stopTimer();

  // build slots
  board.style.gridTemplateColumns = `repeat(${grid}, 1fr)`;
  const total = grid*grid;
  for(let i=0;i<total;i++){
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.index = i;
    slot.addEventListener('dragover', e=>e.preventDefault());
    slot.addEventListener('drop', onDropToSlot);
    board.appendChild(slot);
  }

  // create pieces in tray (shuffled)
  const indices = [...Array(total).keys()];
  shuffle(indices);
  indices.forEach(idx=>{
    const piece = createPieceElement(idx, grid);
    tray.appendChild(piece);
  });

  // mobile: make tray scrollable if needed
  tray.scrollTop = 0;
}

function restartPuzzle(){ startPuzzle(); }

function createPieceElement(pieceIdx, grid){
  const div = document.createElement('div');
  div.className = 'piece';
  div.draggable = true;
  div.dataset.piece = pieceIdx;
  div.addEventListener('dragstart', onDragStart);
  // touch fallback selection
  div.addEventListener('touchstart', onTouchStart, {passive:false});
  div.addEventListener('touchend', onTouchEnd, {passive:false});

  const img = document.createElement('img');
  img.src = `images/${selectedImage}`;
  // compute object-position
  const pr = Math.floor(pieceIdx / grid);
  const pc = pieceIdx % grid;
  const xpos = (pc / Math.max(1, grid - 1)) * 100;
  const ypos = (pr / Math.max(1, grid - 1)) * 100;
  img.style.objectPosition = `${xpos}% ${ypos}%`;
  img.style.objectFit = 'cover';

  div.appendChild(img);
  return div;
}

let dragging = null;
function onDragStart(e){
  dragging = e.currentTarget;
  e.dataTransfer.setData('text/plain', dragging.dataset.piece);
  // custom drag image
  try{
    const crt = dragging.cloneNode(true);
    crt.style.position='absolute';crt.style.top='-9999px';
    document.body.appendChild(crt);
    e.dataTransfer.setDragImage(crt, 30, 30);
    setTimeout(()=>document.body.removeChild(crt), 0);
  }catch(err){}
}

function onDropToSlot(e){
  e.preventDefault();
  const slot = e.currentTarget;
  const pieceIdx = e.dataTransfer.getData('text/plain');
  placePieceToSlot(pieceIdx, slot);
}

// Touch fallback: tap to pick, tap slot to place
let touchSelected = null;
function onTouchStart(e){
  e.preventDefault();
  touchSelected = e.currentTarget;
  touchSelected.classList.add('dragging');
}
function onTouchEnd(e){
  e.preventDefault();
  touchSelected && touchSelected.classList.remove('dragging');
  // if tapping a piece without releasing over slot, keep it selected
  // We'll implement tap-select + tap-slot globally
}

// global board click for tap placement
board.addEventListener('click', (e)=>{
  const slot = e.target.closest('.slot');
  if(!slot) return;
  if(touchSelected){
    // move selected to slot
    const pieceIdx = touchSelected.dataset.piece;
    placePieceToSlot(pieceIdx, slot);
    touchSelected.classList.remove('dragging');
    touchSelected = null;
  } else {
    // pick up piece from slot back to tray
    const p = slot.querySelector('.piece');
    if(p) {
      tray.appendChild(p);
      slot.classList.remove('filled');
    }
  }
});

// place piece into slot (swap if needed)
function placePieceToSlot(pieceIdxStr, slotEl){
  const pieceIdx = Number(pieceIdxStr);
  if(!Number.isFinite(pieceIdx)) return;

  // find piece element (in tray or other slot)
  let pieceEl = tray.querySelector(`.piece[data-piece="${pieceIdx}"]`);
  if(!pieceEl){
    const otherSlot = board.querySelector(`.slot .piece[data-piece="${pieceIdx}"]`);
    if(otherSlot) pieceEl = otherSlot;
  }
  if(!pieceEl) return;

  // if slot already has piece, move that one back to tray
  const prev = slotEl.querySelector('.piece');
  if(prev) tray.appendChild(prev);

  // append piece into slot and resize to fit
  pieceEl.style.width = '100%';
  pieceEl.style.height = '100%';
  slotEl.appendChild(pieceEl);
  slotEl.classList.add('filled');

  // moves & timer
  moves++; movesEl.textContent = moves;
  if(!timer) startTimer();

  // check solved
  checkSolved();
}

function checkSolved(){
  const slots = Array.from(board.querySelectorAll('.slot'));
  const ok = slots.every(s=>{
    const child = s.querySelector('.piece');
    return child && Number(child.dataset.piece) === Number(s.dataset.index);
  });
  if(ok){
    solved = true;
    stopTimer();
    setTimeout(()=> {
      resTitle.textContent = 'Puzzle complete 🎉';
      resText.textContent = `Time — ${seconds}s · Moves — ${moves}`;
      overlay.classList.remove('hidden');
      overlay.classList.add('show');
    }, 180);
  }
}

// solve: put all correct pieces
function solveAll(){
  const slots = Array.from(board.querySelectorAll('.slot'));
  slots.forEach(s=>{
    const correct = Number(s.dataset.index);
    // find the piece (in tray or other slot)
    let piece = tray.querySelector(`.piece[data-piece="${correct}"]`);
    if(!piece){
      const inOther = board.querySelector(`.slot .piece[data-piece="${correct}"]`);
      if(inOther) piece = inOther;
    }
    if(piece){
      piece.style.width='100%'; piece.style.height='100%';
      s.appendChild(piece);
      s.classList.add('filled');
    }
  });
  checkSolved();
}

// preview full
previewBtn.addEventListener('click', ()=> {
  window.open(`images/${selectedImage}`, '_blank');
});

// shuffle helper
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

// timer
function startTimer(){ if(timer) clearInterval(timer); seconds=0; timeEl.textContent='0s'; timer=setInterval(()=>{ seconds++; timeEl.textContent = seconds + 's'; }, 1000); }
function stopTimer(){ if(timer){ clearInterval(timer); timer=null; } }

// wire UI
startBtn.addEventListener('click', startPuzzle);
restartBtn.addEventListener('click', restartPuzzle);
solveBtn.addEventListener('click', solveAll);
playAgain.addEventListener('click', ()=>{ overlay.classList.add('hidden'); overlay.classList.remove('show'); startPuzzle(); });
modeSel.addEventListener('change', ()=> grid = Number(modeSel.value));

// init
renderThumbs();
startPuzzle();
