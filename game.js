// --- исправленный game.js ---
let selectedImage = null;

// выбираем все картинки на главном экране
const images = document.querySelectorAll("#image-selection img"); // оставляем селектор, который есть
images.forEach(img => {
    img.addEventListener("click", () => {
        images.forEach(i => i.classList.remove("selected"));
        img.classList.add("selected");
        selectedImage = img.src; // сохраняем выбранную картинку
    });
});

// кнопка запуска
const startBtn = document.getElementById("startBtn");
startBtn.addEventListener("click", () => {
    if (!selectedImage) {
        alert("Пожалуйста, выбери картинку!");
        return;
    }
    startGame();
});

// canvas и контекст
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// функция запуска игры
function startGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const img = new Image();
    img.src = selectedImage;
    img.onload = () => {
        // рисуем картинку на канвасе
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // здесь можно вызывать остальной код пазла
        if (typeof init === "function") init(); // если есть функция init для пазлов, вызовем её
    };
}
