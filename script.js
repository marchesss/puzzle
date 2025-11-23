const gallery = document.getElementById("gallery");
const game = document.getElementById("game");
const board = document.getElementById("puzzleBoard");
const reshuffleBtn = document.getElementById("reshuffleBtn");

let selectedImage = "";
let gridSize = 8; // 8×8 = 64 кусочка
let pieceSize = 480 / gridSize;
let pieces = [];

document.querySelectorAll(".select-img").forEach(img => {
  img.onclick = () => {
    selectedImage = img.src;
    startPuzzle();
  };
});

function startPuzzle() {
  gallery.classList.add("hidden");
  game.classList.remove("hidden");

  board.innerHTML = "";
  pieces = [];

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {

      let piece = document.createElement("div");
      piece.classList.add("piece");

      piece.style.width = pieceSize + "px";
      piece.style.height = pieceSize + "px";

      piece.style.backgroundImage = `url(${selectedImage})`;
      piece.style.backgroundSize = "480px 480px";
      piece.style.backgroundPosition = `-${x * pieceSize}px -${y * pieceSize}px`;

      piece.correctX = x;
      piece.correctY = y;

      addDragging(piece);
      pieces.push(piece);
    }
  }

  shufflePieces();
}

function shufflePieces() {
  pieces.sort(() => Math.random() - 0.5);

  pieces.forEach((piece, i) => {
    let x = i % gridSize;
    let y = Math.floor(i / gridSize);

    piece.style.left = x * pieceSize + "px";
    piece.style.top = y * pieceSize + "px";

    piece.classList.remove("correct");

    if (!board.contains(piece)) board.appendChild(piece);
  });
}

reshuffleBtn.onclick = shufflePieces;

// Drag logic + snapping
function addDragging(piece) {
  let offsetX, offsetY;

  piece.onmousedown = (e) => {
    offsetX = e.offsetX;
    offsetY = e.offsetY;

    piece.style.zIndex = 1000;

    document.onmousemove = (e) => {
      piece.style.left = e.pageX - board.offsetLeft - offsetX + "px";
      piece.style.top = e.pageY - board.offsetTop - offsetY + "px";
    };

    document.onmouseup = () => {
      piece.style.zIndex = 1;
      document.onmousemove = null;

      snapPiece(piece);
    };
  };
}

// Automatically place in correct position if close
function snapPiece(piece) {
  let correctLeft = piece.correctX * pieceSize;
  let correctTop = piece.correctY * pieceSize;

  let currentLeft = parseInt(piece.style.left);
  let currentTop = parseInt(piece.style.top);

  let dist = Math.hypot(currentLeft - correctLeft, currentTop - correctTop);

  if (dist < 25) {
    piece.style.left = correctLeft + "px";
    piece.style.top = correctTop + "px";
    piece.classList.add("correct");
  }
}
