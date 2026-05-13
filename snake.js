

const readline = require('readline');

// Конфигурация игры
const CONFIG = {
    width: 20,
    height: 20,
    initialSpeed: 200, // миллисекунды
    speedIncrement: 5, // ускорение при каждой еде
    minSpeed: 80
};

// Символы для отображения
const SYMBOLS = {
    cornerTL: '┌',      // верхний левый угол
    cornerTR: '┐',      // верхний правый угол
    cornerBL: '└',      // нижний левый угол
    cornerBR: '┘',      // нижний правый угол
    horizontal: '─',    // горизонтальная линия
    vertical: '│',      // вертикальная линия
    snakeHead: '@',     // голова змеи
    snakeBody: 'o',     // тело змеи
    food: '*',          // еда
    empty: ' '          // пустое пространство
};

// Состояние игры
let gameState = {
    snake: [],          // массив сегментов {x, y}
    direction: 'right', // текущее направление
    nextDirection: 'right', // следующее направление (для предотвращения 180°)
    food: { x: 0, y: 0 }, // позиция еды
    score: 0,
    gameLoop: null,
    speed: CONFIG.initialSpeed,
    isRunning: false,
    isPaused: false
};

// Настройка readline для обработки клавиш
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

// ==================== ФУНКЦИИ ИНИЦИАЛИЗАЦИИ ====================

function initGame() {
    // Сброс состояния
    gameState.score = 0;
    gameState.speed = CONFIG.initialSpeed;
    gameState.direction = 'right';
    gameState.nextDirection = 'right';
    gameState.isRunning = true;
    gameState.isPaused = false;
    
    // Инициализация змеи (3 сегмента в центре)
    const startX = Math.floor(CONFIG.width / 2);
    const startY = Math.floor(CONFIG.height / 2);
    
    gameState.snake = [
        { x: startX, y: startY },         // голова
        { x: startX - 1, y: startY },     // тело
        { x: startX - 2, y: startY }      // хвост
    ];
    
    // Генерация первой еды
    generateFood();
    
    // Очистка экрана и первый рендер
    clearScreen();
    drawField();
    
    // Запуск игрового цикла
    startGameLoop();
}

function generateFood() {
    let validPosition = false;
    
    while (!validPosition) {
        const x = Math.floor(Math.random() * CONFIG.width);
        const y = Math.floor(Math.random() * CONFIG.height);
        
        // Проверка, не находится ли еда на змее
        const onSnake = gameState.snake.some(segment => 
            segment.x === x && segment.y === y
        );
        
        if (!onSnake) {
            gameState.food = { x, y };
            validPosition = true;
        }
    }
}

// ==================== ФУНКЦИИ ОТОБРАЖЕНИЯ ====================

function clearScreen() {
    // Очистка консоли (кроссплатформенно)
    process.stdout.write('\x1Bc');
    // Или используем ANSI escape codes
    process.stdout.write('\u001B[2J\u001B[0;0f');
}

function drawField() {
    // Создает двумерный массив поля
    const field = Array(CONFIG.height).fill(null)
        .map(() => Array(CONFIG.width).fill(SYMBOLS.empty));
    
    // Размещает змею на поле
    gameState.snake.forEach((segment, index) => {
        if (index === 0) {
            field[segment.y][segment.x] = SYMBOLS.snakeHead;
        } else {
            field[segment.y][segment.x] = SYMBOLS.snakeBody;
        }
    });
    
    // Размещает еду
    field[gameState.food.y][gameState.food.x] = SYMBOLS.food;
    
    // Формирует строки вывода
    let output = '';
    
    // Верхняя граница
    output += SYMBOLS.cornerTL + 
               SYMBOLS.horizontal.repeat(CONFIG.width) + 
               SYMBOLS.cornerTR + '\n';
    
    // Игровое поле с боковыми границами
    for (let y = 0; y < CONFIG.height; y++) {
        output += SYMBOLS.vertical;
        for (let x = 0; x < CONFIG.width; x++) {
            output += field[y][x];
        }
        output += SYMBOLS.vertical + '\n';
    }
    
    // Нижняя граница
    output += SYMBOLS.cornerBL + 
               SYMBOLS.horizontal.repeat(CONFIG.width) + 
               SYMBOLS.cornerBR + '\n';
    
    // Информационная панель
    output += '\n';
    output += `┌${'─'.repeat(20)}┐\n`;
    output += `│ Счёт: ${gameState.score.toString().padEnd(12)}│\n`;
    output += `│ Длина: ${gameState.snake.length.toString().padEnd(11)}│\n`;
    output += `│ Скорость: ${(1000/gameState.speed).toFixed(1).padEnd(8)}│\n`;
    output += `└${'─'.repeat(20)}┘\n`;
    
    // Управление
    output += '\nУправление: ↑↓←→ | Q-выход | R-рестарт | P-пауза';
    
    if (gameState.isPaused) {
        output += '\n\n[ ПАУЗА ] Нажмите P для продолжения';
    }
    
    // Вывод на экран
    process.stdout.write(output);
}

function gameOver() {
    gameState.isRunning = false;
    if (gameState.gameLoop) {
        clearInterval(gameState.gameLoop);
        gameState.gameLoop = null;
    }
    
    clearScreen();
    
    // Выводит сообщение без поля
    const message = [
'',                                                                                                                                                                                                                                                                                                                         
        '╔══════════════════════════════════════╗',
        '║           GAME OVER!                 ║',
        '╠══════════════════════════════════════╣',
        `║  Финальный счёт: ${gameState.score.toString().padEnd(19)}║`,
        `║  Длина змеи: ${gameState.snake.length.toString().padEnd(23)}║`,
        '╠══════════════════════════════════════╣',
        '║  R - рестарт                         ║',
        '║  Q - выход                           ║',
        '╚══════════════════════════════════════╝',
        ''
    ].join('\n');
    
    process.stdout.write(message);
}
// ==================== ИГРОВАЯ ЛОГИКА ====================

function moveSnake() {
    if (gameState.isPaused) return;
    
    // Применяет накопленное направление
    gameState.direction = gameState.nextDirection;
    
    // Вычисляет новую позицию головы
    const head = { ...gameState.snake[0] };
    
    switch (gameState.direction) {
        case 'up':    head.y--; break;
        case 'down':  head.y++; break;
        case 'left':  head.x--; break;
        case 'right': head.x++; break;
    }
    
    // Проверка столкновений
    if (checkCollision(head)) {
        gameOver();
        return;
    }
    
    // Добавляет новую голову
    gameState.snake.unshift(head);
    
    // Проверяет, съели ли еду
    if (head.x === gameState.food.x && head.y === gameState.food.y) {
        // Увеличиваем счёт и скорость
        gameState.score += 10;
        gameState.speed = Math.max(
            CONFIG.minSpeed, 
            gameState.speed - CONFIG.speedIncrement
        );
        
        // Генерирует новую еду
        generateFood();
        
        // Перезапускает цикл с новой скоростью
        restartGameLoop();
    } else {
        // Убирает хвост, если еду не съели
        gameState.snake.pop();
    }
}

function checkCollision(head) {
    // Столкновение со стенами
    if (head.x < 0 || head.x >= CONFIG.width || 
        head.y < 0 || head.y >= CONFIG.height) {
        return true;
    }
    
    // Столкновение с собственным телом (кроме головы)
    for (let i = 1; i < gameState.snake.length; i++) {
        if (gameState.snake[i].x === head.x && 
            gameState.snake[i].y === head.y) {
            return true;
        }
    }
    
    return false;
}

// ==================== УПРАВЛЕНИЕ ИГРОВЫМ ЦИКЛОМ ====================

function startGameLoop() {
    if (gameState.gameLoop) {
        clearInterval(gameState.gameLoop);
    }
    
    gameState.gameLoop = setInterval(() => {
        if (gameState.isRunning && !gameState.isPaused) {
            moveSnake();
            clearScreen();
            drawField();
        }
    }, gameState.speed);
}

function restartGameLoop() {
    if (gameState.gameLoop) {
        clearInterval(gameState.gameLoop);
        gameState.gameLoop = setInterval(() => {
            if (gameState.isRunning && !gameState.isPaused) {
                moveSnake();
                clearScreen();
                drawField();
            }
        }, gameState.speed);
    }
}

function gameOver() {
    gameState.isRunning = false;
    if (gameState.gameLoop) {
        clearInterval(gameState.gameLoop);
        gameState.gameLoop = null;
    }
    
    setTimeout(() => {
        clearScreen();
        
        const message = [
            '',
            '╔══════════════════════════════════════╗',
            '║           GAME OVER!                 ║',
            '╠══════════════════════════════════════╣',
            `║  Финальный счёт: ${gameState.score.toString().padEnd(19)} ║`,
            `║  Длина змеи: ${gameState.snake.length.toString().padEnd(23)} ║`,
            '╠══════════════════════════════════════╣',
            '║  R - рестарт                         ║',
            '║  Q - выход                           ║',
            '╚══════════════════════════════════════╝',
            ''
        ].join('\n');
        
        console.log(message);
    }, 50);
}


function restartGame() {
    if (gameState.gameLoop) {
        clearInterval(gameState.gameLoop);
    }
    initGame();
}

function quitGame() {
    if (gameState.gameLoop) {
        clearInterval(gameState.gameLoop);
    }
    clearScreen();
    console.log('Спасибо за игру!');
    console.log(`Финальный счёт: ${gameState.score}`);
    process.exit(0);
}

function togglePause() {
    if (!gameState.isRunning) return;
    
    gameState.isPaused = !gameState.isPaused;
    clearScreen();
    drawField();
}

// ==================== ОБРАБОТКА ВВОДА ====================

function handleInput(key) {
    // Выход
    if (key === 'q' || key === 'Q') {
        quitGame();
        return;
    }
    
    // Рестарт
    if (key === 'r' || key === 'R') {
        restartGame();
        return;
    }
    
    // Пауза
    if (key === 'p' || key === 'P') {
        togglePause();
        return;
    }
    
    // Если игра не активна, игнорирует управление
    if (!gameState.isRunning || gameState.isPaused) return;
    
    // Обработка стрелок
    switch (key) {
        case '\u001B[A': // Стрелка вверх
            if (gameState.nextDirection !== 'down') {
                gameState.nextDirection = 'up';
            }
            break;
        case '\u001B[B': // Стрелка вниз
            if (gameState.nextDirection !== 'up') {
                gameState.nextDirection = 'down';
            }
            break;
        case '\u001B[C': // Стрелка вправо
            if (gameState.nextDirection !== 'left') {
                gameState.nextDirection = 'right';
            }
            break;
        case '\u001B[D': // Стрелка влево
            if (gameState.nextDirection !== 'right') {
                gameState.nextDirection = 'left';
            }
            break;
    }
}

// ==================== ЗАПУСК ИГРЫ ====================

function showWelcome() {
    clearScreen();
    console.log([
        '',
        '╔══════════════════════════════════════╗',
        '║           SNAKE GAME                 ║',
        '║         Классическая Змейка          ║',
        '╠══════════════════════════════════════╣',
        '║                                      ║',
        '║  Управление:                         ║',
        '║    ↑ ↓ ← →  - движение               ║',
        '║    P          - пауза                ║',
        '║    R          - рестарт              ║',
        '║    Q          - выход                ║',
        '║                                      ║',
        '║  Собирайте еду (*) и растите!        ║',
        '║  Не врезайтесь в стены и в себя.     ║',
        '║                                      ║',
        '║  Нажмите любую клавишу для старта... ║',
        '╚══════════════════════════════════════╝',
        ''
    ].join('\n'));
}

// Обработчик клавиш
process.stdin.on('keypress', (str, key) => {
    if (key && key.sequence) {
        handleInput(key.sequence);
    }
});

// Запуск
showWelcome();

// Ждет первого нажатия для старта
process.stdin.once('keypress', () => {
    initGame();
});