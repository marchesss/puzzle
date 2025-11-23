const imageFolder = "images/";

let selectedImage = null;

async function loadImages() {
    const response = await fetch(imageFolder);
    const text = await response.text();

    const fileNames = [...text.matchAll(/href="([^"]+\.(jpg|png|webp|jpeg))"/gi)]
        .map(m => m[1]);

    const list = document.getElementById("imageList");

    fileNames.forEach(name => {
        let div = document.createElement("div");
        div.className = "image-item";
        div.onclick = () => selectImage(name);

        let img = document.createElement("img");
        img.src = imageFolder + name;

        div.appendChild(img);
        list.appendChild(div);
    });
}

function selectImage(name) {
    selectedImage = name;

    document.querySelectorAll(".image-item")
        .forEach(el => el.classList.remove("active"));

    [...document.querySelectorAll(".image-item")]
        .find(el => el.innerHTML.includes(name))
        .classList.add("active");
}

document.getElementById("startBtn").onclick = () => {
    if (!selectedImage) {
        alert("Choose an image!");
        return;
    }

    let difficulty = parseInt(document.getElementById("difficulty").value);

    startPuzzle("images/" + selectedImage, difficulty);
};

document.getElementById("backBtn").onclick = () => {
    document.querySelector(".game").classList.add("hidden");
    document.querySelector(".menu").classList.remove("hidden");
};

// Puzzle logic
function startPuzzle(imgSrc, grid) {
    document.querySelector(".menu").classList.add("hidden");
    document.querySelector(".game").classList.remove("hidden");

    const canvas = document.getElementById("puzzleCanvas");
    const ctx = canvas.getContext("2d");

    const img = new Image();
    img.src = imgSrc;

    img.onload = () => {
        const size = 450;
        canvas.width = size;
        canvas.height = size;

        const pieceSize = size / grid;

        let pieces = [];

        for (let y = 0; y < grid; y++) {
            for (let x = 0; x < grid; x++) {
                pieces.push({ x, y });
            }
        }

        pieces.sort(() => Math.random() - 0.5);

        canvas.onclick = (e) => {
            let rect = canvas.getBoundingClientRect();
            let cx = e.clientX - rect.left;
            let cy = e.clientY - rect.top;

            let clicked = Math.floor(cx / pieceSize) + Math.floor(cy / pieceSize) * grid;

            let emptyIndex = pieces.findIndex(p => p.empty);

            if (emptyIndex === -1) {
                pieces[pieces.length - 1].empty = true;
                emptyIndex = pieces.length - 1;
            }

            let dx = Math.abs(clicked % grid - emptyIndex % grid);
            let dy = Math.abs(Math.floor(clicked / grid) - Math.floor(emptyIndex / grid));

            if (dx + dy === 1) {
                [pieces[clicked], pieces[emptyIndex]] = [pieces[emptyIndex], pieces[clicked]];
            }

            drawPuzzle();
        };

        function drawPuzzle() {
            pieces.forEach((p, i) => {
                let px = (i % grid) * pieceSize;
                let py = Math.floor(i / grid) * pieceSize;

                if (p.empty) {
                    ctx.fillStyle = "black";
                    ctx.fillRect(px, py, pieceSize, pieceSize);
                } else {
                    ctx.drawImage(
                        img,
                        p.x * (img.width / grid),
                        p.y * (img.height / grid),
                        img.width / grid,
                        img.height / grid,
                        px,
                        py,
                        pieceSize,
                        pieceSize
                    );
                }
            });
        }

        drawPuzzle();
    };
}

loadImages();
