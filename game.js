document.addEventListener("DOMContentLoaded", () => {
    let selectedImage = null;

    // выбираем все картинки
    const images = document.querySelectorAll("#image-selection img"); // селектор для твоего блока
    images.forEach(img => {
        img.addEventListener("click", () => {
            images.forEach(i => i.classList.remove("selected")); // снимаем выделение с других
            img.classList.add("selected"); // подсвечиваем выбранную
            selectedImage = img.src; // сохраняем выбранную картинку
        });
    });

    const startBtn = document.getElementById("startBtn");
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    startBtn.addEventListener("click", () => {
        if (!selectedImage) {
            alert("Пожалуйста, выбери картинку!");
            return;
        }
        startGame(selectedImage);
    });

    function startGame(imageSrc) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const img = new Image();
        img.src = imageSrc;
        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            // Если у тебя есть существующая функция init() для пазлов, вызываем её
            if (typeof init === "function") init();
        };
    }
});
