const { JSDOM } = require('jsdom');
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('script.js', 'utf8');

// Заменяем <script src> на inline-скрипт, чтобы дождаться DOMContentLoaded
const inlined = html.replace(/<script[^>]*src=[^>]*><\/script>/, `<script>${js}</script>`);

async function makeDom(storagePayload) {
  const dom = new JSDOM(inlined, { runScripts: 'dangerously', url: 'http://localhost/' });
  if (storagePayload !== undefined) dom.window.localStorage.setItem('gymDayStates', storagePayload);
  await new Promise((resolve) => {
    if (dom.window.document.readyState !== 'loading') return resolve();
    dom.window.document.addEventListener('DOMContentLoaded', () => setTimeout(resolve, 0));
  });
  return dom;
}

let pass = 0;
async function ok(name, fn) { await fn(); pass++; console.log('PASS:', name); }

(async () => {
  // 1. Рендер
  {
    const dom = await makeDom();
    const doc = dom.window.document;
    const title = doc.getElementById('current-month-year').textContent;
    await ok('render: title + 42 day-buttons + 7 weekdays', () => {
      assert.ok(/^[А-ЯЁа-яё]+ 20\d\d$/.test(title), 'title format: ' + JSON.stringify(title));
      assert.strictEqual(doc.querySelectorAll('#calendar .day').length, 42);
      assert.strictEqual(doc.querySelectorAll('#calendar .weekday').length, 7);
      assert.strictEqual(doc.querySelectorAll('#calendar button.day[type="button"]').length, 42);
    });
  }

  // 2. Навигация туда/обратно и «Сегодня»
  {
    const dom = await makeDom();
    const doc = dom.window.document;
    const getTitle = () => doc.getElementById('current-month-year').textContent;
    const t0 = getTitle();
    doc.getElementById('next-month').click();
    const t1 = getTitle();
    doc.getElementById('next-month').click();
    const t2 = getTitle();
    doc.getElementById('prev-month').click();
    doc.getElementById('prev-month').click();
    await ok('navigation changes month and returns', () => {
      assert.notStrictEqual(t0, t1); assert.notStrictEqual(t1, t2);
      assert.strictEqual(getTitle(), t0);
      assert.strictEqual(doc.querySelectorAll('#calendar .day').length, 42);
    });
    doc.getElementById('today-btn').click();
    await ok('today button returns to current month', () => assert.strictEqual(getTitle(), t0));
  }

  // 3. Цикл состояний дня + localStorage
  {
    const dom = await makeDom();
    const doc = dom.window.document;
    const day = doc.querySelector('#calendar .day:not(.other-month)');
    const key = day.dataset.dateKey;
    const stored = () => JSON.parse(dom.window.localStorage.getItem('gymDayStates'))[key];
    day.click();
    await ok('click 1 -> red + saved', () => { assert.ok(day.classList.contains('red')); assert.strictEqual(stored(), 1); });
    day.click();
    await ok('click 2 -> green', () => { assert.ok(day.classList.contains('green')); assert.ok(!day.classList.contains('red')); assert.strictEqual(stored(), 2); });
    day.click();
    await ok('click 3 -> none + removed from storage', () => {
      assert.ok(!day.classList.contains('green') && !day.classList.contains('red'));
      assert.strictEqual(stored(), undefined);
    });
  }

  // 4. Состояние переживает перерисовку при навигации
  {
    const todayKey = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
    const dom = await makeDom(JSON.stringify({ [todayKey]: 2 }));
    const doc = dom.window.document;
    await ok('state restored from storage', () => assert.ok(doc.querySelector('.day.today').classList.contains('green')));
    doc.getElementById('next-month').click();
    doc.getElementById('prev-month').click();
    await ok('state survives re-render', () => assert.ok(doc.querySelector('.day.today').classList.contains('green')));
  }

  // 5. Повреждённый localStorage не ломает приложение
  {
    const dom = await makeDom('{bad json!!!');
    await ok('corrupted storage tolerated', () =>
      assert.strictEqual(dom.window.document.querySelectorAll('#calendar .day').length, 42));
  }

  // 6. Санитизация мусорных записей
  {
    const dom = await makeDom(JSON.stringify({ '2026-10-05': 1, junk: 5, 'x': 'abc', '__proto__': 2 }));
    await ok('sanitization of bad keys/values', () => {
      const marked = [...dom.window.document.querySelectorAll('.day.red')].map(e => e.dataset.dateKey);
      assert.deepStrictEqual(marked, ['2026-10-05']);
    });
  }

  // 7. 12 кликов «вперёд» = тот же месяц в следующем году (нет перескоков)
  {
    const dom = await makeDom();
    const doc = dom.window.document;
    const get = () => doc.getElementById('current-month-year').textContent;
    const start = get();
    for (let i = 0; i < 12; i++) doc.getElementById('next-month').click();
    await ok('12 next clicks == same month next year', () =>
      assert.strictEqual(get(), start.replace(/20\d\d/, (m) => String(+m + 1))));
  }

  // 8. Клавиатура
  {
    const dom = await makeDom();
    const doc = dom.window.document;
    const before = doc.getElementById('current-month-year').textContent;
    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await ok('keyboard ArrowRight navigates', () =>
      assert.notStrictEqual(doc.getElementById('current-month-year').textContent, before));
    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await ok('keyboard Home returns to today', () =>
      assert.strictEqual(doc.getElementById('current-month-year').textContent, before));
  }

  console.log(`\nAll ${pass} checks passed.`);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
