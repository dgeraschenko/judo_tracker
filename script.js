// Главная переменная - объект, где будем хранить состояние дней (0 - не отмечен, 1 - красный, 2 - зеленый)
let dayStates = JSON.parse(localStorage.getItem('gymDayStates')) || {};

// Текущая отображаемая дата
let currentDate = new Date();

// Названия дней недели (начинаем с понедельника)
const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
// Названия месяцев
const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
               'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function generateCalendar() {
    const calendarEl = document.getElementById('calendar');
    calendarEl.innerHTML = ''; // Очищаем календарь

    // Добавляем заголовки дней недели (с понедельника по воскресенье)
    for (let i = 0; i < 7; i++) {
        const weekdayEl = document.createElement('div');
        weekdayEl.classList.add('weekday');
        weekdayEl.textContent = weekdays[i];
        calendarEl.appendChild(weekdayEl);
    }

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Обновляем заголовок
    document.getElementById('current-month-year').textContent = 
        `${months[month]} ${year}`;

    // Первый день месяца
    const firstDay = new Date(year, month, 1);
    // Последний день месяца
    const lastDay = new Date(year, month + 1, 0);
    
    // Корректируем для отображения с понедельника
    let firstDayOfWeek = firstDay.getDay();
    if (firstDayOfWeek === 0) firstDayOfWeek = 7;
    firstDayOfWeek -= 1;

    // Первый день для отображения (может быть из предыдущего месяца)
    const startDay = new Date(firstDay);
    startDay.setDate(startDay.getDate() - firstDayOfWeek);

    // Сегодняшняя дата для сравнения
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Создаем 42 ячейки (6 недель)
    for (let i = 0; i < 42; i++) {
        const currentDay = new Date(startDay);
        currentDay.setDate(startDay.getDate() + i);

        const dayEl = document.createElement('div');
        dayEl.classList.add('day');
        dayEl.textContent = currentDay.getDate();

        // Формируем ключ для этой даты
        const dateKey = formatDateKey(currentDay);

        // Проверяем, относится ли день к текущему месяцу
        if (currentDay.getMonth() !== month) {
            dayEl.classList.add('other-month');
            dayEl.classList.add('yellow'); // Добавляем желтый класс для других месяцев
        }

        // Проверяем, сегодня ли это день
        const checkToday = new Date(currentDay);
        checkToday.setHours(0, 0, 0, 0);
        if (checkToday.getTime() === today.getTime()) {
            dayEl.classList.add('today');
        }

        // Применяем сохраненное состояние дня
        applyDayState(dayEl, dateKey);

        // Обработчик клика
        dayEl.addEventListener('click', () => {
            handleDayClick(dayEl, dateKey);
        });

        calendarEl.appendChild(dayEl);
    }
}

// Функция для применения состояния дня
function applyDayState(dayEl, dateKey) {
    const state = dayStates[dateKey] || 0;
    
    // Удаляем все цветные классы
    dayEl.classList.remove('red', 'green', 'yellow');
    
    // Добавляем соответствующий класс
    if (state === 1) {
        dayEl.classList.add('red');
    } else if (state === 2) {
        dayEl.classList.add('green');
    }
    
    // Для дней других месяцев всегда желтый
    if (dayEl.classList.contains('other-month')) {
        dayEl.classList.add('yellow');
    }
}

// Функция для обработки клика по дню
function handleDayClick(dayEl, dateKey) {
    const currentState = dayStates[dateKey] || 0;
    let newState = (currentState + 1) % 3; // Цикл: 0 → 1 → 2 → 0
    
    dayStates[dateKey] = newState;
    
    // Обновляем внешний вид
    applyDayState(dayEl, dateKey);
    
    // Сохраняем изменения
    localStorage.setItem('gymDayStates', JSON.stringify(dayStates));
}

// Функция для форматирования даты в ключ
function formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Функция для переключения месяцев
function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    generateCalendar();
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    generateCalendar();
    
    // Назначаем обработчики для кнопок
    document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => changeMonth(1));
});
