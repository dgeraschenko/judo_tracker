/**
 * Fitness Calendar Tracker — «Мой календарь спортзала»
 *
 * Ключевые принципы реализации:
 *  - Единый источник правды: состояние живёт в объекте `state`, DOM всегда
 *    перерисовывается из него (state -> render), никаких inline-стилей из JS.
 *  - Никакого дублирования слушателей: делегирование событий на контейнере,
 *    навигация инициализируется один раз.
 *  - Все визуальные эффекты — только CSS (:hover, :active, @media (hover:hover)).
 *  - Корректная работа с localStorage: значения валидируются, повреждённые
 *    данные не ломают приложение.
 */

'use strict';

// ============================================================================
// Constants
// ============================================================================
const STORAGE_KEY = 'gymDayStates';
const DAY_STATES = Object.freeze({ NONE: 0, RED: 1, GREEN: 2 });
const STATE_CLASS = Object.freeze({
    [DAY_STATES.NONE]: null,
    [DAY_STATES.RED]: 'red',
    [DAY_STATES.GREEN]: 'green',
});
const TOTAL_CELLS = 42; // 6 недель × 7 дней — стабильная высота сетки

// ============================================================================
// State
// ============================================================================
const state = {
    viewDate: startOfDay(new Date()), // отображаемый месяц
    dayStates: {},                    // { 'ГГГГ-ММ-ДД': 0 | 1 | 2 }
};

// Кэшируем статичные элементы один раз — они не пересоздаются при рендере
const els = {};

// ============================================================================
// Utility Functions
// ============================================================================
function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

/** Ключ дня в формате YYYY-MM-DD (локальные даты, без таймзонных сдвигов). */
function formatDateKey(date) {
    const y = String(date.getFullYear());
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Смещение первого числа месяца в сетке, начинающейся с понедельника. */
function getFirstWeekdayOffset(year, month) {
    return (new Date(year, month, 1).getDay() + 6) % 7;
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function isCoercibleObject(value) {
    return typeof value === 'object' && value !== null;
}

// ============================================================================
// Storage
// ============================================================================
function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        state.dayStates = sanitizeDayStates(parsed);
    } catch (error) {
        console.warn('Не удалось прочитать данные из localStorage:', error);
        state.dayStates = {};
    }
}

/** Пропускаем только записи вида «ISO-дата → допустимое число состояния». */
function sanitizeDayStates(value) {
    const result = {};
    if (!isCoercibleObject(value)) return result;

    for (const [key, raw] of Object.entries(value)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
        const num = Number(raw);
        if (num === DAY_STATES.NONE || num === DAY_STATES.RED || num === DAY_STATES.GREEN) {
            result[key] = num;
        }
    }
    return result;
}

function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.dayStates));
    } catch (error) {
        // Приватный режим Safari / переполнение квоты — работаем дальше в памяти
        console.warn('Не удалось сохранить данные в localStorage:', error);
    }
}

// ============================================================================
// Rendering
// ============================================================================
function renderCalendar() {
    renderMonthTitle();
    renderDays();
}

function renderMonthTitle() {
    const formatted = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })
        .format(state.viewDate);
    // «октябрь 2026 г.» -> «Октябрь 2026»: убираем суффикс года и капитализируем
    els.monthTitle.textContent = formatted
        .replace(/\s*г\.?$/, '')
        .replace(/^./, (c) => c.toUpperCase());
}

function renderDays() {
    const { viewDate } = state;
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const offset = getFirstWeekdayOffset(year, month);
    const startDate = new Date(year, month, 1 - offset);
    const todayKey = formatDateKey(startOfDay(new Date()));

    // Один DocumentFragment вместо 42 прямых вставок в живой DOM
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < TOTAL_CELLS; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        fragment.append(createDayElement(date, month, todayKey));
    }

    // Дни недели статичны (в HTML), дни месяца — в отдельном контейнере-«теле»,
    // который целиком перерисовывается через replaceChildren(fragment)
    els.daysContainer.replaceChildren(fragment);
}

function createDayElement(date, currentMonth, todayKey) {
    const dateKey = formatDateKey(date);
    const dayEl = document.createElement('button');

    dayEl.className = 'day';
    dayEl.type = 'button';
    dayEl.dataset.dateKey = dateKey;
    dayEl.textContent = date.getDate();

    if (date.getMonth() !== currentMonth) {
        dayEl.classList.add('other-month');
    }
    if (dateKey === todayKey) {
        dayEl.classList.add('today');
        dayEl.setAttribute('aria-current', 'date');
    }

    applyDayStateClass(dayEl, dateKey);
    return dayEl;
}

/** Синхронизирует классы ячейки с состоянием из state.dayStates. */
function applyDayStateClass(dayEl, dateKey) {
    dayEl.classList.remove('red', 'green');
    const className = STATE_CLASS[state.dayStates[dateKey]] ?? null;
    if (className) {
        dayEl.classList.add(className);
        dayEl.setAttribute('aria-pressed', 'true');
    } else {
        dayEl.removeAttribute('aria-pressed');
    }
}

// ============================================================================
// Day Interactions (делегирование: один слушатель на весь календарь)
// ============================================================================
function handleDayActivate(dayEl) {
    const dateKey = dayEl.dataset.dateKey;
    if (!dateKey) return;

    const currentState = state.dayStates[dateKey] ?? DAY_STATES.NONE;
    const newState = (currentState + 1) % 3;

    if (newState === DAY_STATES.NONE) {
        delete state.dayStates[dateKey];
    } else {
        state.dayStates[dateKey] = newState;
    }

    saveToStorage();
    applyDayStateClass(dayEl, dateKey);
}

function setupCalendarDelegation() {
    els.daysContainer.addEventListener('click', (event) => {
        const dayEl = event.target.closest('.day');
        if (dayEl && els.daysContainer.contains(dayEl)) {
            handleDayActivate(dayEl);
        }
    });
}

// ============================================================================
// Navigation
// ============================================================================
/**
 * Безопасная смена месяца: базой всегда служит 1-е число, иначе
 * setMonth от 31 января перескочил бы на март (Date нормализует переполнение).
 */
function changeMonth(direction) {
    const { viewDate } = state;
    state.viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + direction, 1);
    renderCalendar();
}

function goToCurrentMonth() {
    state.viewDate = startOfDay(new Date());
    renderCalendar();
}

function setupNavigation() {
    els.prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    els.nextMonthBtn.addEventListener('click', () => changeMonth(1));
    els.todayBtn.addEventListener('click', goToCurrentMonth);
}

function setupKeyboardNavigation() {
    document.addEventListener('keydown', (event) => {
        // closest() есть только у элементов; target'ом может быть document/window
        const target = event.target;
        if (target instanceof Element && target.closest('input, textarea, select')) return;
        if (event.metaKey || event.ctrlKey || event.altKey) return;

        switch (event.key) {
            case 'ArrowLeft':
                changeMonth(-1);
                break;
            case 'ArrowRight':
                changeMonth(1);
                break;
            case 'Home':
                goToCurrentMonth();
                break;
            default:
                return;
        }
        event.preventDefault();
    });
}

// ============================================================================
// Import / Export
// ============================================================================
function exportData() {
    const json = JSON.stringify(state.dayStates, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'fitness-calendar-data.json';
    link.click();

    URL.revokeObjectURL(url);
}

function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    file.text() // modern replacement for FileReader
        .then((text) => {
            const sanitized = sanitizeDayStates(JSON.parse(text));
            if (Object.keys(sanitized).length === 0) {
                throw new Error('в файле нет корректных записей формата "YYYY-MM-DD": 0|1|2');
            }
            state.dayStates = sanitized;
            saveToStorage();
            renderCalendar();
            showStatus('Данные успешно импортированы.', 'success');
        })
        .catch((error) => {
            showStatus(`Ошибка импорта: ${error.message}`, 'error');
        })
        .finally(() => {
            event.target.value = ''; // можно повторно выбрать тот же файл
        });
}

function setupImportExport() {
    els.exportBtn.addEventListener('click', exportData);
    els.importInput.addEventListener('change', handleImport);
}

// Non-blocking статус вместо alert(): сообщество и доступность предпочитают
// live-region уведомления.
let statusTimer = null;
function showStatus(message, type) {
    els.status.textContent = message;
    els.status.className = `status ${type}`;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
        els.status.textContent = '';
        els.status.className = 'status';
    }, 4000);
}

// ============================================================================
// Application Initialization
// ============================================================================
function cacheElements() {
    const requiredIds = [
        'calendar', 'days-container', 'current-month-year', 'prev-month', 'next-month',
        'today-btn', 'export-btn', 'import-file', 'app-status',
    ];
    for (const id of requiredIds) {
        const el = document.getElementById(id);
        if (!el) {
            throw new Error(`Отсутствует обязательный элемент #${id}`);
        }
        els[id] = el;
    }
    els.monthTitle = els['current-month-year'];
    els.daysContainer = els['days-container'];
    els.prevMonthBtn = els['prev-month'];
    els.nextMonthBtn = els['next-month'];
    els.todayBtn = els['today-btn'];
    els.exportBtn = els['export-btn'];
    els.importInput = els['import-file'];
    els.status = els['app-status'];
}

function init() {
    try {
        cacheElements();
        loadFromStorage();
        setupCalendarDelegation();
        setupNavigation();
        setupKeyboardNavigation();
        setupImportExport();
        renderCalendar();
    } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
        showStatus('Приложение не смогло запуститься. Обновите страницу.', 'error');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}
