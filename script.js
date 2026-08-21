/**
 * Fitness Calendar Tracker
 * A calendar application for tracking gym visits
 */

'use strict';

// ============================================================================
// Constants
// ============================================================================
const STORAGE_KEY = 'gymDayStates';
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];
const DAY_STATES = {
    NONE: 0,
    RED: 1,
    GREEN: 2
};
const COLORS = {
    HOVER: '#e9ecef',
    DEFAULT: '#f8f9fa',
    BUTTON_HOVER_SHADOW: '0 4px 12px rgba(0,0,0,0.2)',
    DAY_HOVER_SHADOW: '0 4px 12px rgba(0,0,0,0.15)'
};

// ============================================================================
// State Management
// ============================================================================
const CalendarApp = {
    currentDate: new Date(),
    dayStates: {},

    init() {
        this.loadFromStorage();
        this.setupEventListeners();
        this.render();
        this.setupDesktopFeatures();
    },

    loadFromStorage() {
        try {
            this.dayStates = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch (e) {
            console.warn('LocalStorage недоступен:', e);
            this.dayStates = {};
        }
    },

    saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.dayStates));
        } catch (e) {
            console.warn('LocalStorage недоступен:', e);
        }
    }
};

// ============================================================================
// Utility Functions
// ============================================================================
function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function isDesktop() {
    return window.innerWidth >= 768 && !isTouchDevice();
}

function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getFirstDayOfMonth(year, month) {
    const firstDay = new Date(year, month, 1);
    let dayOfWeek = firstDay.getDay();
    // Adjust to start from Monday (0 = Monday, 6 = Sunday)
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

// ============================================================================
// Rendering Functions
// ============================================================================
function renderCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    calendarEl.innerHTML = '';
    renderWeekdayHeaders(calendarEl);
    renderMonthTitle();
    renderDays(calendarEl);
}

function renderWeekdayHeaders(container) {
    WEEKDAYS.forEach(day => {
        const weekdayEl = document.createElement('div');
        weekdayEl.className = 'weekday';
        weekdayEl.textContent = day;
        container.appendChild(weekdayEl);
    });
}

function renderMonthTitle() {
    const monthYearEl = document.getElementById('current-month-year');
    if (monthYearEl) {
        const { currentDate } = CalendarApp;
        monthYearEl.textContent = `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
}

function renderDays(container) {
    const { currentDate } = CalendarApp;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOffset = getFirstDayOfMonth(year, month);
    const daysInMonth = getDaysInMonth(year, month);
    const today = normalizeDate(new Date());
    
    const totalCells = 42; // 6 weeks
    const startDate = new Date(year, month, 1 - firstDayOffset);

    for (let i = 0; i < totalCells; i++) {
        const currentDay = new Date(startDate);
        currentDay.setDate(startDate.getDate() + i);
        
        const dayEl = createDayElement(currentDay, month, today);
        container.appendChild(dayEl);
    }
}

function createDayElement(date, currentMonth, today) {
    const dayEl = document.createElement('div');
    dayEl.className = 'day';
    dayEl.textContent = date.getDate();
    
    const dateKey = formatDateKey(date);
    const isCurrentMonth = date.getMonth() === currentMonth;
    const isToday = normalizeDate(date).getTime() === today.getTime();
    
    if (!isCurrentMonth) {
        dayEl.classList.add('other-month', 'yellow');
    }
    
    if (isToday) {
        dayEl.classList.add('today');
    }
    
    applyDayState(dayEl, dateKey);
    setupDayInteractions(dayEl, dateKey);
    
    return dayEl;
}

function normalizeDate(date) {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
}

// ============================================================================
// Day State Management
// ============================================================================
function applyDayState(dayEl, dateKey) {
    const state = CalendarApp.dayStates[dateKey] || DAY_STATES.NONE;
    
    dayEl.classList.remove('red', 'green', 'yellow');
    resetInlineStyles(dayEl);
    
    if (state === DAY_STATES.RED) {
        dayEl.classList.add('red');
        if (isDesktop()) dayEl.style.transform = 'scale(1.05)';
    } else if (state === DAY_STATES.GREEN) {
        dayEl.classList.add('green');
        if (isDesktop()) dayEl.style.transform = 'scale(1.05)';
    }
    
    if (dayEl.classList.contains('other-month')) {
        dayEl.classList.add('yellow');
    }
}

function resetInlineStyles(element) {
    element.style.backgroundColor = '';
    element.style.transform = '';
    element.style.boxShadow = '';
}

function handleDayClick(dayEl, dateKey) {
    const currentState = CalendarApp.dayStates[dateKey] || DAY_STATES.NONE;
    const newState = (currentState + 1) % 3;
    
    CalendarApp.dayStates[dateKey] = newState;
    CalendarApp.saveToStorage();
    
    applyDayState(dayEl, dateKey);
    
    if (!isTouchDevice()) {
        animateClick(dayEl, dateKey);
    }
}

function animateClick(dayEl, dateKey) {
    dayEl.style.transform = 'scale(0.95)';
    setTimeout(() => applyDayState(dayEl, dateKey), 150);
}

function setupDayInteractions(dayEl, dateKey) {
    if (isTouchDevice()) {
        dayEl.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleDayClick(dayEl, dateKey);
        }, { passive: false });
    } else {
        dayEl.addEventListener('click', () => handleDayClick(dayEl, dateKey));
        setupHoverEffects(dayEl);
    }
}

function setupHoverEffects(dayEl) {
    dayEl.addEventListener('mouseenter', () => {
        if (!hasColorClass(dayEl)) {
            dayEl.style.backgroundColor = COLORS.HOVER;
            dayEl.style.transform = 'translateY(-2px)';
            dayEl.style.boxShadow = COLORS.DAY_HOVER_SHADOW;
        }
    });
    
    dayEl.addEventListener('mouseleave', () => {
        if (!hasColorClass(dayEl)) {
            dayEl.style.backgroundColor = COLORS.DEFAULT;
            dayEl.style.transform = 'translateY(0)';
            dayEl.style.boxShadow = 'none';
        }
    });
}

function hasColorClass(element) {
    return element.classList.contains('red') || 
           element.classList.contains('green') || 
           element.classList.contains('yellow');
}

// ============================================================================
// Navigation Functions
// ============================================================================
function changeMonth(direction) {
    CalendarApp.currentDate.setMonth(CalendarApp.currentDate.getMonth() + direction);
    renderCalendar();
}

function goToCurrentMonth() {
    CalendarApp.currentDate = new Date();
    renderCalendar();
}

// ============================================================================
// Event Listeners Setup
// ============================================================================
function setupEventListeners() {
    setupNavigationButtons();
    setupTodayButton();
    setupKeyboardNavigation();
    setupResizeHandler();
    preventDoubleTapZoom();
}

function setupNavigationButtons() {
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => changeMonth(-1));
        setupButtonHover(prevBtn);
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => changeMonth(1));
        setupButtonHover(nextBtn);
    }
}

function setupTodayButton() {
    if (document.getElementById('today-btn')) return;
    
    const todayBtn = document.createElement('button');
    todayBtn.id = 'today-btn';
    todayBtn.textContent = 'Сегодня';
    todayBtn.className = 'today-btn';
    todayBtn.addEventListener('click', goToCurrentMonth);
    setupButtonHover(todayBtn);
    
    const calendarHeader = document.querySelector('.calendar-header');
    if (calendarHeader) {
        calendarHeader.appendChild(todayBtn);
    }
}

function setupButtonHover(button) {
    if (!isDesktop()) return;
    
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = COLORS.BUTTON_HOVER_SHADOW;
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = 'none';
    });
}

function setupKeyboardNavigation() {
    if (isTouchDevice()) return;
    
    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowLeft':
                changeMonth(-1);
                break;
            case 'ArrowRight':
                changeMonth(1);
                break;
            case 'Home':
                goToCurrentMonth();
                break;
        }
    });
}

function setupResizeHandler() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(renderCalendar, 250);
    });
}

function preventDoubleTapZoom() {
    document.addEventListener('dblclick', (e) => {
        e.preventDefault();
    }, { passive: false });
}

// ============================================================================
// Desktop Features (Import/Export)
// ============================================================================
function setupDesktopFeatures() {
    if (!isDesktop()) return;
    
    setTimeout(() => {
        createImportExportButtons();
    }, 1000);
}

function createImportExportButtons() {
    const container = document.querySelector('.container');
    if (!container) return;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'import-export-container';
    
    const exportBtn = createExportButton();
    const importLabel = createImportLabel();
    const importInput = createImportInput();
    
    buttonContainer.append(exportBtn, importLabel, importInput);
    container.appendChild(buttonContainer);
}

function createExportButton() {
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Экспорт';
    exportBtn.className = 'export-btn';
    exportBtn.addEventListener('click', exportData);
    return exportBtn;
}

function createImportLabel() {
    const importLabel = document.createElement('label');
    importLabel.textContent = 'Импорт';
    importLabel.className = 'import-label';
    importLabel.htmlFor = 'import-file';
    return importLabel;
}

function createImportInput() {
    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.id = 'import-file';
    importInput.accept = '.json';
    importInput.addEventListener('change', handleImport);
    return importInput;
}

function exportData() {
    const dataStr = JSON.stringify(CalendarApp.dayStates, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const linkElement = document.createElement('a');
    linkElement.href = dataUri;
    linkElement.download = 'fitness-calendar-data.json';
    linkElement.click();
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            CalendarApp.dayStates = JSON.parse(e.target.result);
            CalendarApp.saveToStorage();
            renderCalendar();
            alert('Данные успешно импортированы!');
        } catch (error) {
            alert('Ошибка при импорте данных: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// ============================================================================
// Application Initialization
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => CalendarApp.init(), 100);
});