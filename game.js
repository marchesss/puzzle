document.addEventListener("DOMContentLoaded", () => {
    let selectedImage = null;

    const images = document.querySelectorAll("#image-selection img");
    const startBtn = document.getElementById("startBtn");
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    // Выбор картинки
    images.forEach(img => {
        img.addEventListener("click", () => {
            images.forEach(i => i.classList.remove("selected"));
            img.classList.add("selected");
            selectedImage = img.src;
        });
    });

    // Кнопка запуска игры
    startBtn.addEventListener("click", () => {
        if (!selectedImage) {
            alert("Пожалуйста, выбери картинку!");
            return;
        }
        startGame(selectedImage);
    });

    // Запуск игры
    function startGame(imageSrc) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const img = new Image();
        img.src = imageSrc;
        img.onload = () => {
            // Отобразим картинку на канвасе
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Если в старом коде есть функция init() для пазлов — вызовем её
            if (typeof init === "function") init();
        };
    }
});
