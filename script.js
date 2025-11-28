// ------------ ГЛАВНЫЕ ПЕРЕМЕННЫЕ ------------
const IMAGES = [
    "images/photo_2025-11-23_20-34-14.jpg",
    "images/photo_2025-11-23_20-34-22.jpg",
    "images/photo_2025-11-23_20-34-28.jpg"
];

let selectedFile = IMAGES[0]; // выбранная картинка
let pieceCount = 30;          // количество фрагментов (уровень)
let pieces = [];
let isDragging = false;
let offsetX = 0;
let offsetY = 0;
let startTime = null;
let timerInterval = null;
let placedPieces = 0;

// ------------ ЭЛЕМЕНТЫ ИНТЕРФЕЙСА ------------
const thumbs = document.querySelectorAll('.thumb');
const playBtn = document.getElementById('playBtn');
const levelSelect = document.getElementById('levelSelect');
const gallery = document.getElementById('gallery');
const game = document.getElementById('game');
const board = document.getElementById('puzzleBoard');
const reshuffleBtn = document.getElementById('reshuffleBtn');
const showImgBtn = document.getElementById('showImgBtn');
const backBtn = document.getElementById('backBtn');
const winModal = document.getElementById('winModal');
const winTimeEl = document.getElementById('winTime');
const winDifficultyEl = document.getElementById('winDifficulty');
const closeWinBtn = document.getElementById('closeWin');
const ghostImage = document.getElementById('ghostImage');

// ------------ ВЫБОР КАРТИНКИ ------------
thumbs.forEach(t => {
    t.addEventListener('click', () => {
        thumbs.forEach(x => x.classList.remove('selected'));
        t.classList.add('selected');
        selectedFile = t.dataset.file;         // <-- ВАЖНО: картинка выбирается
    });
});

// ------------ КНОПКА PLAY ------------
playBtn.addEventListener('click', () => {
    const selectedThumb = document.querySelector('.thumb.selected');
    if (selectedThumb) {
        selectedFile = selectedThumb.dataset.file;
    }

    pieceCount = Number(levelSelect.value);
    startGameSequence();
});

// ------------ КНОПКА ПЕРЕМЕШАТЬ ------------
reshuffleBtn.addEventListener('click', () => {
    shufflePieces();
});

// ------------ КНОПКА ПОКАЗАТЬ КАРТИНКУ ------------
showImgBtn.addEventListener('click', () => {
    ghostImage.style.backgroundImage = `url(${selectedFile})`;
    ghostImage.classList.toggle('visible');
});

// ------------ КНОПКА НАЗАД ------------
backBtn.addEventListener('click', () => {
    resetGame();
    game.classList.add('hidden');
    gallery.classList.remove('hidden');
});

// ------------ ЗАПУСК ИГРЫ ------------
function startGameSequence() {
    gallery.classList.add('hidden');
    game.classList.remove('hidden');

    board.innerHTML = "";
    pieces = [];
    placedPieces = 0;

    ghostImage.style.backgroundImage = `url(${selectedFile})`;

    createPuzzlePieces();
    shufflePieces();

    startTimer();
}

// ------------ СОЗДАНИЕ ФРАГМЕНТОВ ------------
function createPuzzlePieces() {
    const cols = Math.ceil(Math.sqrt(pieceCount));
    const rows = cols;

    const boardSize = 520;
    const pieceW = boardSize / cols;
    const pieceH = boardSize / rows;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (pieces.length >= pieceCount) break;

            let piece = document.createElement('div');
            piece.classList.add('piece');

            piece.style.width = pieceW + "px";
            piece.style.height = pieceH + "px";

            piece.correctX = x * pieceW;
            piece.correctY = y * pieceH;

            piece.style.backgroundImage = `url(${selectedFile})`;
            piece.style.backgroundSize = `${boardSize}px ${boardSize}px`;
            piece.style.backgroundPosition = `-${x * pieceW}px -${y * pieceH}px`;

            addDragEvents(piece);

            pieces.push(piece);
            board.appendChild(piece);
        }
    }
}

// ------------ ПЕРЕМЕШАТЬ ------------
function shufflePieces() {
    pieces.forEach(p => {
        p.classList.remove("locked");
        p.style.left = Math.random() * 350 + 550 + "px"; // справа на поле
        p.style.top = Math.random() * 400 + 50 + "px";
    });
}

// ------------ DRAG & DROP С АВТОПРИТЯГИВАНИЕМ ------------
function addDragEvents(piece) {
    piece.addEventListener('mousedown', e => {
        isDragging = piece;
        offsetX = e.offsetX;
        offsetY = e.offsetY;
        piece.style.zIndex = 1000;
    });

    document.addEventListener('mousemove', e => {
        if (isDragging) {
            isDragging.style.left = e.pageX - offsetX + "px";
            isDragging.style.top = e.pageY - offsetY + "px";
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            snapPiece(isDragging);
            isDragging.style.zIndex = 1;
            isDragging = null;
        }
    });
}

// ------------ ПРИТЯГИВАНИЕ ------------
function snapPiece(piece) {
    const dx = Math.abs(parseInt(piece.style.left) - piece.correctX);
    const dy = Math.abs(parseInt(piece.style.top) - piece.correctY);

    if (dx < 20 && dy < 20) {
        piece.style.left = piece.correctX + "px";
        piece.style.top = piece.correctY + "px";
        piece.classList.add("locked");

        placedPieces++;

        if (placedPieces >= pieceCount) {
            stopTimer();
            showWin();
        }
    }
}

// ------------ ТАЙМЕР ------------
function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {}, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function getTime() {
    return Math.floor((Date.now() - startTime) / 1000);
}

// ------------ ПОБЕДА ------------
function showWin() {
    winTimeEl.textContent = getTime() + "s";
    winDifficultyEl.textContent = pieceCount + " pieces";
    winModal.classList.add("show");
}

closeWinBtn.addEventListener("click", () => {
    winModal.classList.remove("show");
});

// ------------ СБРОС ------------
function resetGame() {
    board.innerHTML = "";
    pieces = [];
    placedPieces = 0;
    stopTimer();
}
