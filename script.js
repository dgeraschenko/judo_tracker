// Главная переменная - объект, где будем хранить состояние дней (0 - не отмечен, 1 - красный, 2 - зеленый)
let dayStates = JSON.parse(localStorage.getItem('gymDayStates')) || {};

// Текущая отображаемая дата
let currentDate = new Date();

// Названия дней недели (начинаем с понедельника)
const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
// Названия месяцев
const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
               'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

// Функция для определения поддержки touch
function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Функция для определения десктопа
function isDesktop() {
    return window.innerWidth >= 768 && !isTouchDevice();
}

function generateCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    
    calendarEl.innerHTML = '';

    // Добавляем заголовки дней недели
    for (let i = 0; i < 7; i++) {
        const weekdayEl = document.createElement('div');
        weekdayEl.classList.add('weekday');
        weekdayEl.textContent = weekdays[i];
        calendarEl.appendChild(weekdayEl);
    }

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Обновляем заголовок
    const monthYearEl = document.getElementById('current-month-year');
    if (monthYearEl) {
        monthYearEl.textContent = `${months[month]} ${year}`;
    }

    // Первый день месяца
    const firstDay = new Date(year, month, 1);
    // Последний день месяца
    const lastDay = new Date(year, month + 1, 0);
    
    // Корректируем для отображения с понедельника
    let firstDayOfWeek = firstDay.getDay();
    if (firstDayOfWeek === 0) firstDayOfWeek = 7;
    firstDayOfWeek -= 1;

    // Первый день для отображения
    const startDay = new Date(firstDay);
    startDay.setDate(startDay.getDate() - firstDayOfWeek);

    // Сегодняшняя дата
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
            dayEl.classList.add('other-month', 'yellow');
        }

        // Проверяем, сегодня ли это день
        const checkToday = new Date(currentDay);
        checkToday.setHours(0, 0, 0, 0);
        if (checkToday.getTime() === today.getTime()) {
            dayEl.classList.add('today');
        }

        // Применяем сохраненное состояние дня
        applyDayState(dayEl, dateKey);

        // Добавляем обработчики в зависимости от устройства
        if (isTouchDevice()) {
            // Для touch устройств
            dayEl.addEventListener('touchstart', (e) => {
                e.preventDefault();
                handleDayClick(dayEl, dateKey);
            }, { passive: false });
        } else {
            // Для десктопа
            dayEl.addEventListener('click', () => {
                handleDayClick(dayEl, dateKey);
            });
            
            // Красивые hover-эффекты только для десктопа
            dayEl.addEventListener('mouseenter', () => {
                if (!dayEl.classList.contains('red') && 
                    !dayEl.classList.contains('green') &&
                    !dayEl.classList.contains('yellow')) {
                    dayEl.style.backgroundColor = '#e9ecef';
                    dayEl.style.transform = 'translateY(-2px)';
                    dayEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }
            });
            
            dayEl.addEventListener('mouseleave', () => {
                if (!dayEl.classList.contains('red') && 
                    !dayEl.classList.contains('green') &&
                    !dayEl.classList.contains('yellow')) {
                    dayEl.style.backgroundColor = '#f8f9fa';
                    dayEl.style.transform = 'translateY(0)';
                    dayEl.style.boxShadow = 'none';
                }
            });
        }

        calendarEl.appendChild(dayEl);
    }
}

// Функция для применения состояния дня
function applyDayState(dayEl, dateKey) {
    const state = dayStates[dateKey] || 0;
    
    // Удаляем все цветные классы
    dayEl.classList.remove('red', 'green', 'yellow');
    
    // Сбрасываем стили
    dayEl.style.backgroundColor = '';
    dayEl.style.transform = '';
    dayEl.style.boxShadow = '';
    
    // Добавляем соответствующий класс
    if (state === 1) {
        dayEl.classList.add('red');
        if (isDesktop()) {
            dayEl.style.transform = 'scale(1.05)';
        }
    } else if (state === 2) {
        dayEl.classList.add('green');
        if (isDesktop()) {
            dayEl.style.transform = 'scale(1.05)';
        }
    }
    
    // Для дней других месяцев всегда желтый
    if (dayEl.classList.contains('other-month')) {
        dayEl.classList.add('yellow');
    }
}

// Функция для обработки клика по дню
function handleDayClick(dayEl, dateKey) {
    const currentState = dayStates[dateKey] || 0;
    let newState = (currentState + 1) % 3;
    
    dayStates[dateKey] = newState;
    
    // Обновляем внешний вид
    applyDayState(dayEl, dateKey);
    
    // Сохраняем изменения с обработкой ошибок
    try {
        localStorage.setItem('gymDayStates', JSON.stringify(dayStates));
    } catch (e) {
        console.warn('LocalStorage недоступен:', e);
    }
    
    // Анимация клика для десктопа
    if (!isTouchDevice()) {
        dayEl.style.transform = 'scale(0.95)';
        setTimeout(() => {
            applyDayState(dayEl, dateKey);
        }, 150);
    }
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

// Функция для перехода к текущему месяцу
function goToCurrentMonth() {
    currentDate = new Date();
    generateCalendar();
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Ждем немного для полной загрузки
    setTimeout(() => {
        generateCalendar();
        
        // Назначаем обработчики для кнопок
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => changeMonth(-1));
            // Добавляем hover эффекты для кнопок на десктопе
            if (!isTouchDevice()) {
                prevBtn.addEventListener('mouseenter', () => {
                    prevBtn.style.transform = 'translateY(-2px)';
                    prevBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                });
                prevBtn.addEventListener('mouseleave', () => {
                    prevBtn.style.transform = 'translateY(0)';
                    prevBtn.style.boxShadow = 'none';
                });
            }
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => changeMonth(1));
            if (!isTouchDevice()) {
                nextBtn.addEventListener('mouseenter', () => {
                    nextBtn.style.transform = 'translateY(-2px)';
                    nextBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                });
                nextBtn.addEventListener('mouseleave', () => {
                    nextBtn.style.transform = 'translateY(0)';
                    nextBtn.style.boxShadow = 'none';
                });
            }
        }
        
        // Добавляем кнопку "Сегодня" если ее нет в HTML
        if (!document.getElementById('today-btn')) {
            const todayBtn = document.createElement('button');
            todayBtn.id = 'today-btn';
            todayBtn.textContent = 'Сегодня';
            todayBtn.style.cssText = 'background: #ff6b6b; color: white; border: none; padding: 12px 20px; border-radius: 12px; cursor: pointer; font-weight: bold; margin-left: 10px;';
            
            todayBtn.addEventListener('click', goToCurrentMonth);
            
            if (isDesktop()) {
                todayBtn.addEventListener('mouseenter', () => {
                    todayBtn.style.transform = 'translateY(-2px)';
                    todayBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                });
                todayBtn.addEventListener('mouseleave', () => {
                    todayBtn.style.transform = 'translateY(0)';
                    todayBtn.style.boxShadow = 'none';
                });
            }
            
            const calendarHeader = document.querySelector('.calendar-header');
            if (calendarHeader) {
                calendarHeader.appendChild(todayBtn);
            }
        }
        
        // Предотвращение масштабирования при двойном тапе на iOS
        document.addEventListener('dblclick', (e) => {
            e.preventDefault();
        }, { passive: false });
        
    }, 100);
});

// Обработка изменения ориентации и размера окна
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        generateCalendar();
    }, 250);
});

// Добавляем поддержку клавиатуры для десктопа
if (!isTouchDevice()) {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            changeMonth(-1);
        } else if (e.key === 'ArrowRight') {
            changeMonth(1);
        } else if (e.key === 'Home') {
            goToCurrentMonth();
        }
    });
}

// Функция для экспорта данных (дополнительная функция для десктопа)
function exportData() {
    if (isDesktop()) {
        const dataStr = JSON.stringify(dayStates, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'fitness-calendar-data.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }
}

// Функция для импорта данных (дополнительная функция для десктопа)
function importData(event) {
    if (isDesktop()) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    dayStates = importedData;
                    localStorage.setItem('gymDayStates', JSON.stringify(dayStates));
                    generateCalendar();
                    alert('Данные успешно импортированы!');
                } catch (error) {
                    alert('Ошибка при импорте данных: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
    }
}

// Добавляем кнопки импорта/экспорта для десктопа
if (isDesktop()) {
    setTimeout(() => {
        const exportBtn = document.createElement('button');
        exportBtn.textContent = 'Экспорт';
        exportBtn.style.cssText = 'background: #6c757d; color: white; border: none; padding: 8px 15px; border-radius: 8px; cursor: pointer; margin-left: 10px; font-size: 14px;';
        exportBtn.addEventListener('click', exportData);
        
        const importBtn = document.createElement('input');
        importBtn.type = 'file';
        importBtn.accept = '.json';
        importBtn.style.cssText = 'display: none;';
        importBtn.addEventListener('change', importData);
        
        const importLabel = document.createElement('label');
        importLabel.textContent = 'Импорт';
        importLabel.style.cssText = 'background: #6c757d; color: white; border: none; padding: 8px 15px; border-radius: 8px; cursor: pointer; margin-left: 10px; font-size: 14px; display: inline-block;';
        importLabel.htmlFor = 'import-file';
        
        const container = document.querySelector('.container');
        if (container) {
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = 'display: flex; justify-content: center; margin-top: 20px; gap: 10px;';
            buttonContainer.appendChild(exportBtn);
            buttonContainer.appendChild(importLabel);
            buttonContainer.appendChild(importBtn);
            container.appendChild(buttonContainer);
        }
    }, 1000);
}