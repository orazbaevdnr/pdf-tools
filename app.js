'use strict';

/* ─── PDF.js worker ────────────────────────────────────────────────────────── */
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/* ─── Tool catalogue ───────────────────────────────────────────────────────── */
const TOOLS = [
  // ── Convert FROM PDF ──────────────────────────────────────────────────────
  {
    id: 'pdf-to-jpg',   name: 'PDF в JPG',
    desc: 'Каждая страница PDF конвертируется в JPG с выбором качества',
    icon: '🖼️',  color: '#E8445A', category: 'from-pdf',
    accept: '.pdf', multiple: false, btnLabel: 'Конвертировать в JPG',
  },
  {
    id: 'pdf-to-word',  name: 'PDF в Word',
    desc: 'Извлекает текст и форматирование и сохраняет в .docx',
    icon: '📝',  color: '#E8445A', category: 'from-pdf',
    accept: '.pdf', multiple: false, btnLabel: 'Конвертировать в Word',
  },
  {
    id: 'pdf-to-ppt',   name: 'PDF в PowerPoint',
    desc: 'Каждая страница PDF становится отдельным слайдом .pptx',
    icon: '📊',  color: '#E8445A', category: 'from-pdf',
    accept: '.pdf', multiple: false, btnLabel: 'Конвертировать в PowerPoint',
  },
  {
    id: 'pdf-to-excel', name: 'PDF в Excel',
    desc: 'Распознаёт табличную структуру и экспортирует в .xlsx',
    icon: '📈',  color: '#E8445A', category: 'from-pdf',
    accept: '.pdf', multiple: false, btnLabel: 'Конвертировать в Excel',
  },
  // ── Convert TO PDF ────────────────────────────────────────────────────────
  {
    id: 'jpg-to-pdf',   name: 'JPG в PDF',
    desc: 'Объединяет несколько изображений JPG/PNG в один PDF',
    icon: '📄',  color: '#3E7BFA', category: 'to-pdf',
    accept: '.jpg,.jpeg,.png,.webp', multiple: true, btnLabel: 'Создать PDF',
  },
  {
    id: 'word-to-pdf',  name: 'Word в PDF',
    desc: 'Конвертирует .docx/.doc в PDF с сохранением форматирования',
    icon: '📝',  color: '#3E7BFA', category: 'to-pdf',
    accept: '.docx,.doc', multiple: false, btnLabel: 'Конвертировать в PDF',
  },
  {
    id: 'ppt-to-pdf',   name: 'PowerPoint в PDF',
    desc: 'Каждый слайд .pptx переносится на страницу PDF',
    icon: '📊',  color: '#3E7BFA', category: 'to-pdf',
    accept: '.pptx,.ppt', multiple: false, btnLabel: 'Конвертировать в PDF',
  },
  {
    id: 'excel-to-pdf', name: 'Excel в PDF',
    desc: 'Экспортирует таблицы .xlsx/.csv в аккуратный PDF',
    icon: '📈',  color: '#3E7BFA', category: 'to-pdf',
    accept: '.xlsx,.xls,.csv', multiple: false, btnLabel: 'Конвертировать в PDF',
  },
  // ── Organize ──────────────────────────────────────────────────────────────
  {
    id: 'merge-pdf',    name: 'Объединить PDF',
    desc: 'Объединяет несколько PDF-файлов в один документ',
    icon: '🔗',  color: '#7C3AED', category: 'organize',
    accept: '.pdf', multiple: true, btnLabel: 'Объединить',
  },
  {
    id: 'split-pdf',    name: 'Разделить PDF',
    desc: 'Делит PDF на страницы или заданные диапазоны',
    icon: '✂️',  color: '#7C3AED', category: 'organize',
    accept: '.pdf', multiple: false, btnLabel: 'Разделить',
  },
  // ── Optimize ──────────────────────────────────────────────────────────────
  {
    id: 'compress-pdf', name: 'Сжать PDF',
    desc: 'Уменьшает вес файла PDF без видимой потери качества',
    icon: '🗜️',  color: '#D97706', category: 'optimize',
    accept: '.pdf', multiple: false, btnLabel: 'Сжать',
  },
  {
    id: 'rotate-pdf',   name: 'Повернуть PDF',
    desc: 'Поворачивает страницы PDF на 90°, 180° или 270°',
    icon: '🔄',  color: '#D97706', category: 'optimize',
    accept: '.pdf', multiple: false, btnLabel: 'Повернуть',
  },
];

/* ─── CloudConvert tools set ───────────────────────────────────────────────── */
// These tools use CloudConvert when an API key is available
const CC_TOOLS = new Set([
  'word-to-pdf', 'ppt-to-pdf', 'excel-to-pdf',
  'pdf-to-word', 'pdf-to-ppt', 'pdf-to-excel',
]);

/* ─── State ────────────────────────────────────────────────────────────────── */
let currentTool    = null;
let uploadedFiles  = [];
let resultObjectUrl = null;

/* ─── Bootstrap ────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderGrids();
  initSettingsModal();
  updateSettingsBtn();

  document.getElementById('logo-link').addEventListener('click', e => { e.preventDefault(); navHome(); });
  document.getElementById('back-btn').addEventListener('click', navHome);
  document.getElementById('btn-reset').addEventListener('click', () => currentTool && openTool(currentTool));
  document.getElementById('btn-convert').addEventListener('click', startConvert);
  document.getElementById('cc-badge-setup').addEventListener('click', () => openSettingsModal());
  document.addEventListener('click', e => {
    const card = e.target.closest('.tool-card');
    if (card) window.location.hash = card.dataset.tool;
  });
  window.addEventListener('hashchange', handleHash);
  handleHash();
});

/* ─── Settings modal ───────────────────────────────────────────────────────── */
function initSettingsModal() {
  const modal    = document.getElementById('settings-modal');
  const btnOpen  = document.getElementById('btn-settings');
  const btnClose = document.getElementById('modal-close');
  const input    = document.getElementById('cc-key-input');
  const toggle   = document.getElementById('cc-key-toggle');
  const saveBtn  = document.getElementById('cc-key-save');
  const clearBtn = document.getElementById('cc-key-clear');
  const status   = document.getElementById('cc-key-status');
  const clearRow = document.getElementById('cc-key-clear-row');

  btnOpen.addEventListener('click', () => openSettingsModal());

  btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });

  // Show/hide password toggle
  toggle.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    toggle.querySelector('svg').innerHTML = show
      ? '<path fill-rule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1 1 0 000-.75C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074L3.28 2.22zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd"/><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10a1 1 0 000 .75C1.732 14.057 5.522 17 10 17c.848 0 1.668-.105 2.454-.303z"/>'
      : '<path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>';
  });

  // Save key
  saveBtn.addEventListener('click', () => {
    const key = input.value.trim();
    if (!key) {
      showKeyStatus('error', '⚠ Введите API ключ');
      return;
    }
    if (key.length < 20) {
      showKeyStatus('error', '⚠ Ключ слишком короткий — скопируйте полный токен');
      return;
    }
    localStorage.setItem('cc_api_key', key);
    showKeyStatus('ok', '✓ API ключ сохранён! Конвертации будут выполняться через CloudConvert.');
    clearRow.classList.remove('hidden');
    updateSettingsBtn();
    updateCcBadge();
  });

  // Clear key
  clearBtn.addEventListener('click', () => {
    localStorage.removeItem('cc_api_key');
    input.value = '';
    clearRow.classList.add('hidden');
    showKeyStatus('error', '🗑 Ключ удалён. Будет использоваться браузер-режим.');
    updateSettingsBtn();
    updateCcBadge();
  });

  function showKeyStatus(type, text) {
    status.className = 'modal-key-status ' + (type === 'ok' ? 'status-ok' : 'status-err');
    status.textContent = text;
    status.classList.remove('hidden');
    if (type === 'ok') setTimeout(() => status.classList.add('hidden'), 4000);
  }
}

function openSettingsModal() {
  const modal    = document.getElementById('settings-modal');
  const input    = document.getElementById('cc-key-input');
  const clearRow = document.getElementById('cc-key-clear-row');
  const status   = document.getElementById('cc-key-status');

  const saved = localStorage.getItem('cc_api_key') || '';
  input.value = saved ? saved.slice(0, 12) + '•'.repeat(Math.min(saved.length - 12, 40)) : '';
  clearRow.classList.toggle('hidden', !saved);
  status.classList.add('hidden');
  modal.classList.remove('hidden');
  if (!saved) setTimeout(() => document.getElementById('cc-key-input').focus(), 100);
}

function updateSettingsBtn() {
  const btn   = document.getElementById('btn-settings');
  const label = document.getElementById('settings-btn-label');
  const hasKey = !!localStorage.getItem('cc_api_key');
  if (hasKey) {
    btn.classList.add('key-active');
    label.textContent = '✓ API';
  } else {
    btn.classList.remove('key-active');
    label.textContent = 'API';
  }
}

function updateCcBadge() {
  const badge   = document.getElementById('cc-badge');
  const icon    = document.getElementById('cc-badge-icon');
  const text    = document.getElementById('cc-badge-text');
  const setupBtn = document.getElementById('cc-badge-setup');

  if (!currentTool || !CC_TOOLS.has(currentTool.id)) {
    badge.classList.add('hidden');
    return;
  }

  const hasKey = !!localStorage.getItem('cc_api_key');
  badge.classList.remove('hidden', 'cc-green', 'cc-yellow');

  if (hasKey) {
    badge.classList.add('cc-green');
    icon.textContent  = '✓';
    text.textContent  = 'CloudConvert API · Профессиональное качество (LibreOffice)';
    setupBtn.textContent = 'Изменить ключ';
  } else {
    badge.classList.add('cc-yellow');
    icon.textContent  = '⚠';
    text.textContent  = 'Браузер-режим · Базовое качество · Добавьте API ключ для 100% результата';
    setupBtn.textContent = 'Настроить API →';
  }
}

/* ─── Grid rendering ───────────────────────────────────────────────────────── */
function renderGrids() {
  const MAP = {
    'from-pdf': 'grid-from-pdf', 'to-pdf': 'grid-to-pdf',
    organize:   'grid-organize',  optimize: 'grid-optimize',
  };
  for (const [cat, id] of Object.entries(MAP)) {
    document.getElementById(id).innerHTML = TOOLS
      .filter(t => t.category === cat)
      .map(t => `
        <div class="tool-card" data-tool="${t.id}" style="--card-color:${t.color}">
          <div class="tool-card-icon" style="background:${t.color}18;color:${t.color}">${t.icon}</div>
          <div class="tool-card-name">${t.name}</div>
          <div class="tool-card-desc">${t.desc}</div>
        </div>`).join('');
  }
}

/* ─── Router ───────────────────────────────────────────────────────────────── */
function handleHash() {
  const id   = window.location.hash.slice(1);
  const tool = TOOLS.find(t => t.id === id);
  tool ? openTool(tool) : navHome();
}

function navHome() {
  document.getElementById('view-home').classList.add('active');
  document.getElementById('view-tool').classList.remove('active');
  history.pushState(null, '', location.pathname);
  document.title = 'PDFTools — Инструменты для работы с PDF';
  document.documentElement.style.setProperty('--accent', '#E8445A');
  revokeResult();
}

/* ─── Open tool ────────────────────────────────────────────────────────────── */
function openTool(tool) {
  currentTool   = tool;
  uploadedFiles = [];

  document.getElementById('view-home').classList.remove('active');
  document.getElementById('view-tool').classList.add('active');

  // Header
  const iconEl = document.getElementById('tool-icon');
  iconEl.textContent = tool.icon;
  iconEl.style.cssText =
    `background:${tool.color}18;color:${tool.color};width:72px;height:72px;` +
    `border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:36px;flex-shrink:0`;
  document.getElementById('tool-title').textContent = tool.name;
  document.getElementById('tool-desc').textContent  = tool.desc;
  document.getElementById('btn-convert-text').textContent = tool.btnLabel || 'Конвертировать';
  document.documentElement.style.setProperty('--accent', tool.color);
  document.querySelector('.btn-upload').style.background = tool.color;

  // Notice hidden by default (all tools work)
  document.getElementById('tool-notice').classList.add('hidden');

  // Show CloudConvert status badge for Office↔PDF tools
  updateCcBadge();

  // File input
  const fi = document.getElementById('file-input');
  fi.accept = tool.accept; fi.multiple = !!tool.multiple; fi.value = '';

  const exts = tool.accept.split(',').map(e => e.trim().toUpperCase().replace('.', '')).join(', ');
  document.getElementById('upload-fmt').textContent = `Поддерживаемые форматы: ${exts}`;

  resetPanels();
  renderOptions(tool);
  setupUpload();

  document.title = `${tool.name} — PDFTools`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetPanels() {
  ['files-list','tool-options','action-area','progress-area','result-area']
    .forEach(id => document.getElementById(id).classList.add('hidden'));
  document.getElementById('files-list').innerHTML   = '';
  document.getElementById('tool-options').innerHTML = '';
  setProgress(0, '');
  revokeResult();
}

/* ─── Upload ───────────────────────────────────────────────────────────────── */
function setupUpload() {
  const area     = document.getElementById('upload-area');
  const fi       = document.getElementById('file-input');
  const btnChoose = document.getElementById('btn-choose');

  btnChoose.onclick  = e => { e.stopPropagation(); fi.click(); };
  area.onclick       = e => { if (e.target === area || e.target.closest('.upload-content')) fi.click(); };
  fi.onchange        = e => { if (e.target.files.length) addFiles(Array.from(e.target.files)); };
  area.ondragover    = e => { e.preventDefault(); area.classList.add('drag-over'); };
  area.ondragleave   = ()  => area.classList.remove('drag-over');
  area.ondrop        = e => {
    e.preventDefault(); area.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files);
    if (files.length) addFiles(files);
  };
}

function addFiles(files) {
  if (!currentTool.multiple) {
    uploadedFiles = [files[0]];
  } else {
    const seen = new Set(uploadedFiles.map(f => f.name + f.size));
    files.forEach(f => { if (!seen.has(f.name + f.size)) uploadedFiles.push(f); });
  }
  renderFiles();
}

function renderFiles() {
  const listEl = document.getElementById('files-list');
  if (!uploadedFiles.length) {
    listEl.classList.add('hidden');
    document.getElementById('action-area').classList.add('hidden');
    return;
  }
  const rows = uploadedFiles.map((f, i) => `
    <div class="file-item">
      <span class="file-icon">${fileIcon(f)}</span>
      <div class="file-info">
        <div class="file-name">${esc(f.name)}</div>
        <div class="file-size">${fmtSize(f.size)}</div>
      </div>
      <button class="file-remove" data-i="${i}" title="Удалить">✕</button>
    </div>`).join('');

  const footer = currentTool.multiple ? `
    <div class="files-footer">
      <span>${uploadedFiles.length} ${pluralFiles(uploadedFiles.length)} · ${fmtSize(uploadedFiles.reduce((s,f)=>s+f.size,0))}</span>
      <button class="btn-add-more" id="btn-add-more">+ Добавить ещё</button>
    </div>` : '';

  listEl.innerHTML = rows + footer;
  listEl.classList.remove('hidden');

  listEl.querySelectorAll('.file-remove').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      uploadedFiles.splice(+btn.dataset.i, 1);
      renderFiles();
    })
  );
  document.getElementById('btn-add-more')?.addEventListener('click', () =>
    document.getElementById('file-input').click()
  );

  const optsEl = document.getElementById('tool-options');
  if (optsEl.innerHTML.trim()) optsEl.classList.remove('hidden');
  document.getElementById('action-area').classList.remove('hidden');
}

/* ─── Per-tool options ─────────────────────────────────────────────────────── */
function renderOptions(tool) {
  const el = document.getElementById('tool-options');
  let html = '';

  if (tool.id === 'pdf-to-jpg') {
    html = opt('Качество изображения', 'opt-quality', [
      ['1.5|0.75', 'Стандартное — 72 dpi'],
      ['2.0|0.90', 'Высокое — 150 dpi (рекомендуется)', true],
      ['3.0|0.95', 'Максимальное — 300 dpi'],
    ]);
  } else if (tool.id === 'jpg-to-pdf') {
    html = opt('Размер страницы', 'opt-pagesize', [
      ['fit', 'По размеру изображения', true],
      ['a4', 'A4 (210 × 297 мм)'],
      ['letter', 'Letter (216 × 279 мм)'],
    ]);
  } else if (tool.id === 'pdf-to-word') {
    html = opt('Режим конвертации', 'opt-word-mode', [
      ['image', 'Точный дизайн — страницы как изображения (рекомендуется)', true],
      ['text',  'Редактируемый текст — извлечение содержимого'],
    ]);
  } else if (tool.id === 'pdf-to-excel') {
    html = opt('Режим', 'opt-excel-mode', [
      ['table', 'Определять столбцы автоматически', true],
      ['rows',  'Каждая строка как одна ячейка'],
    ]);
  } else if (tool.id === 'split-pdf') {
    html = `
      ${opt('Режим разделения', 'opt-split-mode', [
        ['all',   'Каждую страницу отдельно', true],
        ['range', 'По диапазонам'],
      ])}
      <div class="option-group hidden" id="opt-range-group">
        <label class="option-label">Диапазоны (пример: 1-3, 5, 7-9)</label>
        <input type="text" class="option-input" id="opt-range" placeholder="1-3, 5, 7-9"/>
      </div>`;
  } else if (tool.id === 'rotate-pdf') {
    html = `
      ${opt('Угол поворота', 'opt-rotation', [
        ['90', '90° по часовой стрелке', true],
        ['180', '180°'],
        ['270', '90° против часовой стрелки'],
      ])}
      ${opt('Применить к страницам', 'opt-pages', [
        ['all', 'Все страницы', true],
        ['odd', 'Нечётные (1, 3, 5…)'],
        ['even','Чётные (2, 4, 6…)'],
      ])}`;
  } else if (tool.id === 'compress-pdf') {
    html = opt('Уровень сжатия', 'opt-compress', [
      ['medium', 'Среднее — баланс размера и качества', true],
      ['high',   'Высокое — максимальная экономия места'],
    ]);
  } else if (tool.id === 'word-to-pdf') {
    html = opt('Качество рендеринга', 'opt-w2p-scale', [
      ['1.5', 'Стандартное'],
      ['2',   'Высокое (рекомендуется)', true],
    ]);
  } else if (tool.id === 'excel-to-pdf') {
    html = opt('Ориентация', 'opt-xl-orient', [
      ['l', 'Альбомная (рекомендуется)', true],
      ['p', 'Книжная'],
    ]);
  }

  el.innerHTML = html;

  // Dynamic split range toggle
  if (tool.id === 'split-pdf') {
    document.getElementById('opt-split-mode')?.addEventListener('change', e =>
      document.getElementById('opt-range-group').classList.toggle('hidden', e.target.value !== 'range')
    );
  }
}

function opt(label, id, options) {
  const optHtml = options.map(([v, l, sel]) =>
    `<option value="${v}"${sel ? ' selected' : ''}>${l}</option>`).join('');
  return `<div class="option-group">
    <label class="option-label">${label}</label>
    <select class="option-select" id="${id}">${optHtml}</select>
  </div>`;
}

function getOpts() {
  const o = {};
  document.querySelectorAll('#tool-options .option-select').forEach(s => { o[s.id.replace('opt-', '')] = s.value; });
  document.querySelectorAll('#tool-options .option-input').forEach(i  => { o[i.id.replace('opt-', '')] = i.value; });
  return o;
}

/* ─── Conversion dispatcher ────────────────────────────────────────────────── */
async function startConvert() {
  if (!uploadedFiles.length) return;
  const opts = getOpts();

  ['action-area','files-list','tool-options'].forEach(id =>
    document.getElementById(id).classList.add('hidden'));
  showProgress(3, 'Подготовка…');

  try {
    let result;
    switch (currentTool.id) {
      case 'pdf-to-jpg':   result = await doPdfToJpg(opts);   break;
      case 'pdf-to-word':  result = await doPdfToWord(opts);  break;
      case 'pdf-to-ppt':   result = await doPdfToPpt(opts);   break;
      case 'pdf-to-excel': result = await doPdfToExcel(opts); break;
      case 'jpg-to-pdf':   result = await doJpgToPdf(opts);   break;
      case 'word-to-pdf':  result = await doWordToPdf(opts);  break;
      case 'ppt-to-pdf':   result = await doPptToPdf(opts);   break;
      case 'excel-to-pdf': result = await doExcelToPdf(opts); break;
      case 'merge-pdf':    result = await doMerge();          break;
      case 'split-pdf':    result = await doSplit(opts);      break;
      case 'compress-pdf': result = await doCompress(opts);   break;
      case 'rotate-pdf':   result = await doRotate(opts);     break;
      default: throw new Error('Неизвестный инструмент');
    }
    showResult(result);
  } catch (err) {
    console.error(err);
    document.getElementById('progress-area').classList.add('hidden');
    ['action-area','files-list'].forEach(id => document.getElementById(id).classList.remove('hidden'));
    const op = document.getElementById('tool-options');
    if (op.innerHTML.trim()) op.classList.remove('hidden');
    alert('Ошибка: ' + (err.message || 'Не удалось обработать файл.'));
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
   CLOUDCONVERT API
══════════════════════════════════════════════════════════════════════════════ */
const CC_API = 'https://api.cloudconvert.com/v2';

/**
 * Convert a file via CloudConvert API v2.
 * Returns a Blob on success.
 * Throws with .code='NO_KEY'   — API key not set
 * Throws with .code='QUOTA'    — free quota exceeded (caller may fallback)
 * Throws with .code='AUTH'     — invalid API key
 * Throws for other errors.
 */
async function cloudConvertFile(file, outputFormat, onProgress) {
  const apiKey = localStorage.getItem('cc_api_key') || '';
  if (!apiKey) throw Object.assign(new Error('API ключ не настроен.'), { code: 'NO_KEY' });

  onProgress(6, 'Создание задачи на CloudConvert…');

  // 1. Create job ──────────────────────────────────────────────────────────────
  let jobRes;
  try {
    jobRes = await fetch(`${CC_API}/jobs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: {
          'import-my-file': {
            operation: 'import/upload',
          },
          'convert-my-file': {
            operation: 'convert',
            input: ['import-my-file'],
            output_format: outputFormat,
            // LibreOffice engine — best quality for Office docs
            ...(isOfficeFormat(outputFormat) || isOfficeExt(file.name)
              ? { engine: 'libreoffice' }
              : {}),
          },
          'export-my-file': {
            operation: 'export/url',
            input: ['convert-my-file'],
          },
        },
      }),
    });
  } catch (e) {
    throw new Error('Ошибка сети при подключении к CloudConvert: ' + e.message);
  }

  if (jobRes.status === 401) {
    throw Object.assign(
      new Error('Неверный API ключ CloudConvert. Откройте настройки и проверьте ключ.'),
      { code: 'AUTH' }
    );
  }
  if (jobRes.status === 402) {
    throw Object.assign(
      new Error('Достигнут лимит бесплатных конвертаций CloudConvert (25/день). Попробуйте завтра или обновите план.'),
      { code: 'QUOTA' }
    );
  }
  if (!jobRes.ok) {
    let msg = jobRes.status;
    try { const j = await jobRes.json(); msg = j?.message || msg; } catch {}
    throw new Error('CloudConvert ошибка: ' + msg);
  }

  const job = await jobRes.json();
  const jobId = job.data.id;
  const uploadTask = job.data.tasks.find(t => t.operation === 'import/upload');

  if (!uploadTask?.result?.form) {
    throw new Error('CloudConvert не вернул форму загрузки файла.');
  }

  onProgress(16, 'Загрузка файла на CloudConvert…');

  // 2. Upload file ─────────────────────────────────────────────────────────────
  const form = uploadTask.result.form;
  const fd   = new FormData();
  if (form.parameters) {
    for (const [k, v] of Object.entries(form.parameters)) {
      if (v != null) fd.append(k, String(v));
    }
  }
  fd.append('file', file);

  let upRes;
  try {
    upRes = await fetch(form.url, { method: 'POST', body: fd });
  } catch (e) {
    throw new Error('Ошибка загрузки файла: ' + e.message);
  }
  if (!upRes.ok) throw new Error(`Ошибка загрузки на сервер CloudConvert (${upRes.status}).`);

  onProgress(28, 'Конвертация на сервере (LibreOffice)…');

  // 3. Poll for completion ─────────────────────────────────────────────────────
  const TIMEOUT_MS = 150_000; // 2.5 min
  const start = Date.now();
  let attempt = 0;

  while (Date.now() - start < TIMEOUT_MS) {
    await delay(attempt < 5 ? 2500 : 4000);
    attempt++;

    let statusRes;
    try {
      statusRes = await fetch(`${CC_API}/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
    } catch { continue; }
    if (!statusRes.ok) continue;

    const sd = await statusRes.json();
    const tasks = sd.data.tasks || [];

    // Rough progress: finished tasks / total tasks
    const finishedCount = tasks.filter(t => t.status === 'finished').length;
    onProgress(
      28 + Math.min((finishedCount / Math.max(tasks.length, 1)) * 56, 56),
      'Конвертация на сервере…'
    );

    if (sd.data.status === 'finished') {
      const expTask = tasks.find(t => t.operation === 'export/url' && t.status === 'finished');
      const fileUrl = expTask?.result?.files?.[0]?.url;
      if (!fileUrl) throw new Error('CloudConvert не вернул URL результата.');

      onProgress(88, 'Скачивание результата…');
      let dlRes;
      try { dlRes = await fetch(fileUrl); }
      catch (e) { throw new Error('Ошибка скачивания результата: ' + e.message); }
      if (!dlRes.ok) throw new Error(`Ошибка скачивания (${dlRes.status}).`);

      const blob = await dlRes.blob();
      onProgress(98, 'Готово!');
      return blob;
    }

    if (sd.data.status === 'error') {
      const errTask = tasks.find(t => t.status === 'error');
      throw new Error('Ошибка CloudConvert: ' + (errTask?.message || 'неизвестная ошибка на сервере'));
    }
  }

  throw new Error('Превышено время ожидания конвертации (2.5 мин). Попробуйте ещё раз.');
}

function isOfficeFormat(fmt) {
  return ['pdf','docx','doc','pptx','ppt','xlsx','xls','odt','ods','odp'].includes(fmt);
}
function isOfficeExt(name) {
  const ext = name.split('.').pop().toLowerCase();
  return ['docx','doc','pptx','ppt','xlsx','xls','odt','ods','odp'].includes(ext);
}

/**
 * Try CloudConvert first. Returns result object or null (→ browser fallback).
 * Throws only for fatal errors (wrong key, etc.)
 */
async function tryCC(file, outputFormat, outputFilename) {
  const apiKey = localStorage.getItem('cc_api_key');
  if (!apiKey) return null;  // No key → use browser silently

  showProgress(3, 'Подключение к CloudConvert…');
  try {
    const blob = await cloudConvertFile(file, outputFormat, (pct, txt) => setProgress(pct, txt));
    setProgress(100, 'Готово!');
    return {
      blob,
      filename: outputFilename,
      info: '✓ CloudConvert · LibreOffice · Профессиональное качество',
    };
  } catch (e) {
    if (e.code === 'QUOTA') {
      // Fall back to browser with a note
      setProgress(3, '⚠ Лимит CloudConvert. Переключаемся на браузер…');
      await delay(1400);
      return null;
    }
    if (e.code === 'NO_KEY') return null;
    throw e; // Real error (bad key, network, etc.) → propagate
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
   PROCESSORS
══════════════════════════════════════════════════════════════════════════════ */

/* ── 1. PDF → JPG ─────────────────────────────────────────────────────────── */
async function doPdfToJpg(opts) {
  const file = uploadedFiles[0];
  const [scaleStr, qualStr] = (opts.quality || '2.0|0.90').split('|');
  const scale   = parseFloat(scaleStr);
  const quality = parseFloat(qualStr);

  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const n   = pdf.numPages;
  setProgress(8, `Найдено страниц: ${n}`);

  const renderPage = async pageNum => {
    const page = await pdf.getPage(pageNum);
    const vp   = page.getViewport({ scale });
    const cv   = document.createElement('canvas');
    cv.width = vp.width; cv.height = vp.height;
    await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
    return new Promise(res => cv.toBlob(res, 'image/jpeg', quality));
  };

  if (n === 1) {
    setProgress(60, 'Рендеринг…');
    const blob = await renderPage(1);
    setProgress(100, 'Готово!');
    return { blob, filename: base(file.name, '.pdf') + '.jpg' };
  }

  const zip = new JSZip();
  for (let i = 1; i <= n; i++) {
    setProgress(8 + (i / n) * 84, `Рендеринг страницы ${i}/${n}…`);
    const blob = await renderPage(i);
    zip.file(`page-${pad(i)}.jpg`, await blob.arrayBuffer());
  }
  setProgress(96, 'Создание ZIP…');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  setProgress(100, 'Готово!');
  return {
    blob: zipBlob,
    filename: base(file.name, '.pdf') + '-images.zip',
    info: `${n} изображений в ZIP-архиве`,
  };
}

/* ── 2. PDF → Word (.docx) ────────────────────────────────────────────────── */
async function doPdfToWord(opts) {
  // ── CloudConvert first (real LibreOffice conversion — always best) ────────
  const ccResult = await tryCC(
    uploadedFiles[0], 'docx',
    base(uploadedFiles[0].name, '.pdf') + '.docx'
  );
  if (ccResult) return ccResult;

  // ── Browser fallback ──────────────────────────────────────────────────────
  if (typeof docx === 'undefined') throw new Error('Библиотека docx не загружена. Проверьте соединение.');
  const { Document, Packer, Paragraph, TextRun, ImageRun } = docx;

  const file = uploadedFiles[0];
  const pdf  = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const n    = pdf.numPages;
  const mode = opts['word-mode'] || 'image';
  const children = [];

  /* ── IMAGE MODE: каждая страница PDF → картинка в docx ──────────────── */
  if (mode === 'image') {
    // A4 width in EMU: 8 547 600 (= 15.24 cm × 914400)
    // We render at 2× and fit to A4 content width (~16 cm)
    const A4_W_PX = 1240; // ~A4 content width at 150 dpi

    for (let i = 1; i <= n; i++) {
      setProgress(5 + (i / n) * 88, `Рендеринг страницы ${i}/${n}…`);
      if (i > 1) children.push(new Paragraph({ pageBreakBefore: true, children: [] }));

      const page = await pdf.getPage(i);
      const natVp = page.getViewport({ scale: 1 });
      const scale = A4_W_PX / natVp.width;
      const vp    = page.getViewport({ scale });

      const cv = document.createElement('canvas');
      cv.width = vp.width; cv.height = vp.height;
      await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;

      const imgBuf = await new Promise(res =>
        cv.toBlob(b => b.arrayBuffer().then(res), 'image/jpeg', 0.92)
      );

      // Fit image to A4 content area (595 pt wide ≈ 7920 twips; docx width = ~8686400 EMU for margins)
      const CONTENT_W = 8_686_400;  // EMU — approx A4 minus 2.5 cm margins each side
      const aspectH   = Math.round(CONTENT_W * (vp.height / vp.width));

      children.push(new Paragraph({
        children: [new ImageRun({
          data: imgBuf,
          transformation: { width: Math.round(CONTENT_W / 9144), height: Math.round(aspectH / 9144) },
        })],
        spacing: { before: 0, after: 0 },
      }));
    }

  /* ── TEXT MODE: извлечение текста с приближённым форматированием ─────── */
  } else {
    for (let i = 1; i <= n; i++) {
      setProgress(5 + (i / n) * 80, `Извлечение текста: страница ${i}/${n}…`);
      if (i > 1) children.push(new Paragraph({ pageBreakBefore: true, children: [] }));

      const page  = await pdf.getPage(i);
      const tc    = await page.getTextContent({ includeMarkedContent: false });
      const items = tc.items.filter(it => it.str?.trim());
      if (!items.length) continue;

      items.sort((a, b) => b.transform[5] - a.transform[5]);

      const lines = [];
      let cur = null;
      for (const it of items) {
        const y = it.transform[5];
        if (!cur || Math.abs(cur.y - y) > 3) {
          cur = { y, height: it.height || 12, parts: [it] };
          lines.push(cur);
        } else {
          cur.parts.push(it);
          cur.height = Math.max(cur.height, it.height || 12);
        }
      }
      lines.forEach(l => l.parts.sort((a, b) => a.transform[4] - b.transform[4]));

      for (const l of lines) {
        const text = l.parts.map(p => p.str).join('').trim();
        if (!text) continue;
        const h = l.height;
        children.push(new Paragraph({
          children: [new TextRun({ text, bold: h >= 16, size: Math.round(Math.max(h, 9) * 1.5) * 2 })],
          spacing: { before: h >= 16 ? 180 : 40, after: 60 },
        }));
      }
    }
  }

  setProgress(92, 'Создание .docx…');
  const blob = await Packer.toBlob(new Document({
    creator: 'PDFTools',
    title:   base(file.name, '.pdf'),
    sections: [{
      properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children,
    }],
  }));
  setProgress(100, 'Готово!');
  return {
    blob,
    filename: base(file.name, '.pdf') + '.docx',
    info: mode === 'image'
      ? `${n} страниц встроено как изображения`
      : `Извлечено ${n} ${pluralPages(n)} текста`,
  };
}

/* ── 3. PDF → PowerPoint (.pptx) ─────────────────────────────────────────── */
async function doPdfToPpt() {
  // ── CloudConvert first ────────────────────────────────────────────────────
  const ccResult = await tryCC(
    uploadedFiles[0], 'pptx',
    base(uploadedFiles[0].name, '.pdf') + '.pptx'
  );
  if (ccResult) return ccResult;

  // ── Browser fallback ──────────────────────────────────────────────────────
  if (typeof PptxGenJS === 'undefined') throw new Error('Библиотека PptxGenJS не загружена.');

  const file = uploadedFiles[0];
  const pdf  = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const n    = pdf.numPages;

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';

  for (let i = 1; i <= n; i++) {
    setProgress(5 + (i / n) * 88, `Слайд ${i}/${n}…`);
    const page = await pdf.getPage(i);
    const vp   = page.getViewport({ scale: 1.5 });
    const cv   = document.createElement('canvas');
    cv.width = vp.width; cv.height = vp.height;
    await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;

    const slide = pptx.addSlide();
    slide.addImage({
      data: cv.toDataURL('image/jpeg', 0.88),
      x: 0, y: 0, w: '100%', h: '100%',
    });
  }

  setProgress(95, 'Создание .pptx…');
  const ab = await pptx.write('arraybuffer');
  setProgress(100, 'Готово!');
  return {
    blob: new Blob([ab], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }),
    filename: base(file.name, '.pdf') + '.pptx',
    info: `${n} слайдов`,
  };
}

/* ── 4. PDF → Excel (.xlsx) ──────────────────────────────────────────────── */
async function doPdfToExcel(opts) {
  // ── CloudConvert first ────────────────────────────────────────────────────
  const ccResult = await tryCC(
    uploadedFiles[0], 'xlsx',
    base(uploadedFiles[0].name, '.pdf') + '.xlsx'
  );
  if (ccResult) return ccResult;

  // ── Browser fallback ──────────────────────────────────────────────────────
  const file   = uploadedFiles[0];
  const pdf    = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const n      = pdf.numPages;
  const mode   = opts['excel-mode'] || 'table';
  const wb     = XLSX.utils.book_new();

  for (let i = 1; i <= n; i++) {
    setProgress(5 + (i / n) * 88, `Страница ${i}/${n}…`);
    const page = await pdf.getPage(i);
    const tc   = await page.getTextContent({ includeMarkedContent: false });
    const items = tc.items.filter(it => it.str?.trim());
    if (!items.length) continue;

    items.sort((a, b) => b.transform[5] - a.transform[5]);

    if (mode === 'rows') {
      // Each visual line → one cell in column A
      const rows = groupIntoLines(items, 4).map(l =>
        [l.parts.map(p => p.str).join('').trim()]
      ).filter(r => r[0]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), `Страница ${i}`);
      continue;
    }

    // Auto-detect column positions by clustering X
    const lines = groupIntoLines(items, 4);
    const allX  = items.map(it => it.transform[4]);
    const cols  = clusterPositions(allX, 20);

    const sheetData = lines.map(line => {
      const row = new Array(cols.length).fill('');
      line.parts.forEach(it => {
        const ci = nearestIndex(cols, it.transform[4]);
        row[ci] = (row[ci] ? row[ci] + ' ' : '') + it.str.trim();
      });
      return row;
    }).filter(r => r.some(c => c));

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetData), `Страница ${i}`);
  }

  if (!wb.SheetNames.length) throw new Error('Не удалось извлечь текст из PDF.');

  setProgress(95, 'Создание .xlsx…');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  setProgress(100, 'Готово!');
  return {
    blob: new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename: base(file.name, '.pdf') + '.xlsx',
    info: `${n} ${pluralPages(n)} → ${wb.SheetNames.length} листов`,
  };
}

/* ── 5. JPG → PDF ────────────────────────────────────────────────────────── */
async function doJpgToPdf(opts) {
  const { PDFDocument } = PDFLib;
  const doc      = await PDFDocument.create();
  const pageSize = opts.pagesize || 'fit';

  for (let i = 0; i < uploadedFiles.length; i++) {
    setProgress(5 + ((i + 1) / uploadedFiles.length) * 88, `Изображение ${i + 1}/${uploadedFiles.length}…`);
    const f  = uploadedFiles[i];
    const ab = await f.arrayBuffer();
    let img;
    try {
      img = f.type === 'image/png' ? await doc.embedPng(ab) : await doc.embedJpg(ab);
    } catch {
      img = await doc.embedJpg(await canvasConvertToJpeg(f));
    }
    const { width: iw, height: ih } = img;
    const [pw, ph] = pageSize === 'a4' ? [595.28, 841.89]
                   : pageSize === 'letter' ? [612, 792]
                   : [iw, ih];
    const page = doc.addPage([pw, ph]);
    const s    = Math.min(pw / iw, ph / ih, 1);
    page.drawImage(img, { x: (pw - iw * s) / 2, y: (ph - ih * s) / 2, width: iw * s, height: ih * s });
  }

  setProgress(96, 'Сохранение…');
  const bytes = await doc.save();
  setProgress(100, 'Готово!');
  const name = uploadedFiles.length === 1 ? base(uploadedFiles[0].name) : 'images';
  return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: name + '.pdf' };
}

/* ── 6. Word → PDF ────────────────────────────────────────────────────────── */
async function doWordToPdf(opts) {
  // ── CloudConvert first ────────────────────────────────────────────────────
  const ccResult = await tryCC(
    uploadedFiles[0], 'pdf',
    base(uploadedFiles[0].name) + '.pdf'
  );
  if (ccResult) return ccResult;

  // ── Browser fallback ──────────────────────────────────────────────────────
  if (typeof html2canvas  === 'undefined') throw new Error('html2canvas не загружен.');
  if (typeof window.jspdf === 'undefined') throw new Error('jsPDF не загружен.');

  const file    = uploadedFiles[0];
  const ab      = await file.arrayBuffer();
  const cvScale = parseFloat(opts['w2p-scale'] || '2');

  setProgress(10, 'Чтение документа…');

  // ── Off-screen container — НИКОГДА не visibility:hidden, только left:-9999px ──
  const host = document.createElement('div');
  // Фиксированная ширина A4 (794px ≈ 210mm@96dpi), ВСЕГДА видимый DOM-элемент
  host.style.cssText =
    'position:fixed;left:-9999px;top:0;width:794px;background:#fff;' +
    'overflow:visible;pointer-events:none;';
  document.body.appendChild(host);

  let usedDocxPreview = false;

  /* ── Путь 1: docx-preview (высокое качество) ─────────────────────── */
  if (typeof docxPreview !== 'undefined') {
    try {
      setProgress(20, 'Рендеринг docx-preview…');

      await docxPreview.renderAsync(ab, host, null, {
        inWrapper:       true,
        ignoreWidth:     false,
        ignoreHeight:    false,
        renderHeaders:   true,
        renderFooters:   true,
        renderFootnotes: true,
        experimental:    true,
        useBase64URL:    true,
        debug:           false,
      });

      // Ждём загрузки картинок и шрифтов
      await imgLoadAll(host);
      await delay(500);
      usedDocxPreview = true;
      setProgress(48, 'Рендеринг завершён…');
    } catch (e) {
      console.warn('docx-preview error, fallback to mammoth:', e);
      host.innerHTML = '';
    }
  }

  /* ── Путь 2: mammoth (запасной) ──────────────────────────────────── */
  if (!usedDocxPreview) {
    if (typeof mammoth === 'undefined') throw new Error('Нет доступных библиотек для чтения DOCX.');
    setProgress(20, 'Рендеринг mammoth…');

    const { value } = await mammoth.convertToHtml({
      arrayBuffer: ab,
      convertImage: mammoth.images.imgElement(img =>
        img.read('base64').then(b => ({ src: `data:${img.contentType};base64,${b}` }))
      ),
    });

    host.style.padding   = '56px 68px';
    host.style.boxSizing = 'border-box';
    host.style.font      = '12pt/1.7 "Times New Roman",Georgia,serif';
    host.style.color     = '#111';

    const sty = document.createElement('style');
    sty.textContent = `
      h1{font-size:22pt;font-weight:700;margin:20px 0 10px}
      h2{font-size:17pt;font-weight:700;margin:16px 0 8px}
      h3{font-size:14pt;font-weight:700;margin:13px 0 7px}
      p{margin:0 0 9px}
      ul,ol{margin:0 0 9px 24px}li{margin-bottom:3px}
      table{border-collapse:collapse;width:100%;margin:12px 0;font-size:11pt}
      td,th{border:1px solid #999;padding:5px 8px;vertical-align:top}
      th{background:#e8e8e8;font-weight:700}
      img{max-width:100%;height:auto;display:block;margin:8px 0}
      strong,b{font-weight:700}em,i{font-style:italic}
      u{text-decoration:underline}
      blockquote{margin:10px 20px;padding-left:12px;border-left:3px solid #ccc;color:#555}
    `;
    host.appendChild(sty);
    const body = document.createElement('div');
    body.innerHTML = value || '<p>(пустой документ)</p>';
    host.appendChild(body);

    await imgLoadAll(host);
    await delay(300);
    setProgress(48, 'Рендеринг завершён…');
  }

  /* ── Захват с html2canvas ─────────────────────────────────────────── */
  const { jsPDF } = window.jspdf;
  const PW = 595.28, PH = 841.89;
  const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });

  // Если docx-preview вернул постраничные section — снимаем каждую отдельно
  const pageEls = usedDocxPreview
    ? Array.from(host.querySelectorAll('section.docx'))
    : [];

  if (pageEls.length > 0) {
    for (let pi = 0; pi < pageEls.length; pi++) {
      setProgress(48 + (pi / pageEls.length) * 44, `Страница ${pi + 1}/${pageEls.length}…`);
      if (pi > 0) pdf.addPage();

      const cv = await html2canvas(pageEls[pi], {
        scale:           cvScale,
        backgroundColor: '#ffffff',
        useCORS:         true,
        allowTaint:      true,
        logging:         false,
        removeContainer: false,
      });

      // section уже имеет размер страницы — масштабируем под A4
      const h = PW * cv.height / cv.width;
      pdf.addImage(cv.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, PW, h);
    }
  } else {
    // Снимаем весь host одним куском и нарезаем по A4
    setProgress(50, 'Захват…');
    const cv = await html2canvas(host, {
      scale:           cvScale,
      backgroundColor: '#ffffff',
      useCORS:         true,
      allowTaint:      true,
      logging:         false,
      width:           794,
      windowWidth:     794,
    });

    const ratio = PW / cv.width;
    const fullH = cv.height * ratio;
    let   yPt   = 0;
    let   page  = 0;

    while (yPt < fullH) {
      if (page > 0) pdf.addPage();
      page++;
      setProgress(50 + Math.min((yPt / fullH) * 44, 44), `Страница ${page}…`);

      const srcY  = yPt / ratio;
      const srcH  = Math.min(PH / ratio, cv.height - srcY);
      const sl    = document.createElement('canvas');
      sl.width    = cv.width;
      sl.height   = Math.ceil(srcH);
      sl.getContext('2d').drawImage(cv, 0, srcY, cv.width, srcH, 0, 0, sl.width, sl.height);
      pdf.addImage(sl.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, PW, sl.height * ratio);
      yPt += PH;
    }
  }

  document.body.removeChild(host);

  setProgress(98, 'Финализация…');
  const bytes = pdf.output('arraybuffer');
  setProgress(100, 'Готово!');
  return {
    blob: new Blob([bytes], { type: 'application/pdf' }),
    filename: base(file.name) + '.pdf',
    info: usedDocxPreview ? 'Высокое качество (docx-preview)' : 'Базовое форматирование (mammoth)',
  };
}

/* ── 7. PowerPoint → PDF  (html2canvas rendering) ────────────────────────── */
async function doPptToPdf() {
  // ── CloudConvert first ────────────────────────────────────────────────────
  const ccResult = await tryCC(
    uploadedFiles[0], 'pdf',
    base(uploadedFiles[0].name) + '.pdf'
  );
  if (ccResult) return ccResult;

  // ── Browser fallback ──────────────────────────────────────────────────────
  if (typeof window.jspdf    === 'undefined') throw new Error('jsPDF не загружен.');
  if (typeof html2canvas     === 'undefined') throw new Error('html2canvas не загружен.');

  const file = uploadedFiles[0];
  const ab   = await file.arrayBuffer();

  setProgress(6, 'Чтение .pptx…');
  let zip;
  try { zip = await JSZip.loadAsync(ab); }
  catch { throw new Error('Не удалось открыть файл. Убедитесь, что это .pptx формат.'); }

  const slideFiles = Object.keys(zip.files)
    .filter(k => /^ppt\/slides\/slide\d+\.xml$/.test(k))
    .sort((a, b) => slideNum(a) - slideNum(b));
  if (!slideFiles.length) throw new Error('Слайды не найдены.');

  // ── Slide dimensions ─────────────────────────────────────────────────────
  let emuW = 9_144_000, emuH = 5_143_500; // default 16:9
  try {
    const sz = new DOMParser()
      .parseFromString(await zip.file('ppt/presentation.xml').async('string'), 'text/xml')
      .querySelector('sldSz');
    if (sz) { emuW = +sz.getAttribute('cx'); emuH = +sz.getAttribute('cy'); }
  } catch {}

  const mmW = emu2mm(emuW), mmH = emu2mm(emuH);

  // Render at ~96 dpi equivalent on screen (1 mm = 3.78 px)
  const SCALE   = 2;                              // retina-like canvas quality
  const pxW     = Math.round(mmW * 3.78 * SCALE);
  const pxH     = Math.round(mmH * 3.78 * SCALE);

  // ── Theme colour map (optional, best-effort) ──────────────────────────────
  const themeColors = {};
  try {
    const themeXml = await zip.file('ppt/theme/theme1.xml').async('string');
    const tDoc = new DOMParser().parseFromString(themeXml, 'text/xml');
    tDoc.querySelectorAll('sysClr,srgbClr').forEach(el => {
      const last = el.getAttribute('lastClr') || el.getAttribute('val');
      if (last && el.parentElement) themeColors[el.parentElement.localName] = '#' + last;
    });
  } catch {}

  const { jsPDF } = window.jspdf;
  const isL = mmW >= mmH;
  const pdf = new jsPDF({ orientation: isL ? 'l' : 'p', unit: 'mm', format: [mmW, mmH] });
  const parser = new DOMParser();

  // ── Helper: decode a colour node → CSS hex ───────────────────────────────
  const cssColor = (el) => {
    if (!el) return null;
    const srgb = el.querySelector('srgbClr');
    if (srgb) return '#' + (srgb.getAttribute('val') || '000000');
    const sys  = el.querySelector('sysClr');
    if (sys)  return '#' + (sys.getAttribute('lastClr') || '000000');
    const schm = el.querySelector('schemeClr');
    if (schm) return themeColors[schm.getAttribute('val')] || null;
    return null;
  };

  // ── Per-slide render ──────────────────────────────────────────────────────
  for (let si = 0; si < slideFiles.length; si++) {
    setProgress(8 + (si / slideFiles.length) * 84, `Слайд ${si + 1} / ${slideFiles.length}…`);
    if (si > 0) pdf.addPage([mmW, mmH], isL ? 'l' : 'p');

    const sn      = slideNum(slideFiles[si]);
    const slideXml = await zip.file(slideFiles[si]).async('string');
    const sDoc    = parser.parseFromString(slideXml, 'text/xml');

    // ── Build image URL map from slide rels ──────────────────────────
    const imgMap = {};   // rId → data-URI
    try {
      const relsXml = await zip.file(`ppt/slides/_rels/slide${sn}.xml.rels`)?.async('string');
      if (relsXml) {
        for (const r of parser.parseFromString(relsXml, 'text/xml').querySelectorAll('Relationship')) {
          const tgt = r.getAttribute('Target');
          if (!tgt?.match(/\.(png|jpe?g|gif|bmp|webp)$/i)) continue;
          const path = tgt.replace('../', 'ppt/');
          const u8   = await zip.file(path)?.async('uint8array');
          if (u8) {
            const ext  = path.split('.').pop().toLowerCase();
            const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
            imgMap[r.getAttribute('Id')] = `data:${mime};base64,${uint8ToBase64(u8)}`;
          }
        }
      }
    } catch {}

    // ── Create the slide DOM element ─────────────────────────────────
    // ВАЖНО: position:fixed + left далеко за экраном.
    // НЕ visibility:hidden — html2canvas не снимет невидимые элементы.
    const slide = document.createElement('div');
    slide.style.cssText =
      `position:fixed;left:-9999px;top:0;` +
      `width:${pxW}px;height:${pxH}px;` +
      `overflow:hidden;background:#ffffff;` +
      `font-family:Calibri,Arial,sans-serif;`;

    // ── Background fill ──────────────────────────────────────────────
    const bgFill = sDoc.querySelector('bg bgPr');
    if (bgFill) {
      const col = cssColor(bgFill.querySelector('solidFill'));
      if (col) slide.style.background = col;
    }

    // ── Background images (bgPr blipFill) ───────────────────────────
    const bgBlip = sDoc.querySelector('bgPr blipFill blip');
    if (bgBlip) {
      const rId = bgBlip.getAttribute('r:embed');
      if (imgMap[rId]) {
        slide.style.backgroundImage  = `url(${imgMap[rId]})`;
        slide.style.backgroundSize   = '100% 100%';
        slide.style.backgroundRepeat = 'no-repeat';
      }
    }

    // ── Pictures (pic elements) ──────────────────────────────────────
    for (const pic of sDoc.querySelectorAll('pic')) {
      const rId = pic.querySelector('blipFill blip')?.getAttribute('r:embed');
      if (!rId || !imgMap[rId]) continue;
      const off = pic.querySelector('spPr xfrm off');
      const ext = pic.querySelector('spPr xfrm ext');
      const x   = off ? emuToPx(+off.getAttribute('x'), emuW, pxW) : 0;
      const y   = off ? emuToPx(+off.getAttribute('y'), emuH, pxH) : 0;
      const w   = ext ? emuToPx(+ext.getAttribute('cx'), emuW, pxW) : pxW;
      const h   = ext ? emuToPx(+ext.getAttribute('cy'), emuH, pxH) : pxH;

      const img = document.createElement('img');
      img.src = imgMap[rId];
      img.style.cssText =
        `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;object-fit:fill`;
      slide.appendChild(img);
    }

    // ── Shapes with text ─────────────────────────────────────────────
    // Font size: PPTX stores in hundredths of a point (e.g. 2400 = 24pt)
    // We need to convert to px for the rendered canvas at SCALE px/mm * mm/pt
    // 1 pt = 1/72 inch = 25.4/72 mm. At pxW pixels for emuW EMU:
    // ptToPx = (pxW / emuW) * 914400 / 72   [EMU per inch / 72 pts per inch]
    const ptToPx = (pxW / emuW) * (914400 / 72);

    for (const sp of sDoc.querySelectorAll('sp')) {
      const txBody = sp.querySelector('txBody');
      if (!txBody) continue;

      const off = sp.querySelector('spPr xfrm off');
      const ext = sp.querySelector('spPr xfrm ext');
      const x   = off ? emuToPx(+off.getAttribute('x'), emuW, pxW) : 0;
      const y   = off ? emuToPx(+off.getAttribute('y'), emuH, pxH) : 0;
      const w   = ext ? emuToPx(+ext.getAttribute('cx'), emuW, pxW) : pxW;
      const h   = ext ? emuToPx(+ext.getAttribute('cy'), emuH, pxH) : pxH;

      // Shape solid fill
      const spPrEl   = sp.querySelector('spPr');
      const shapeBg  = cssColor(spPrEl?.querySelector('solidFill'));

      const box = document.createElement('div');
      box.style.cssText =
        `position:absolute;left:${x}px;top:${y}px;` +
        `width:${w}px;height:${h}px;` +
        `overflow:hidden;box-sizing:border-box;` +
        (shapeBg ? `background:${shapeBg};` : '');

      // Vertical alignment
      const vert = txBody.querySelector('bodyPr')?.getAttribute('anchor');
      if (vert === 'ctr') {
        box.style.display = 'flex';
        box.style.flexDirection = 'column';
        box.style.justifyContent = 'center';
      } else if (vert === 'b') {
        box.style.display = 'flex';
        box.style.flexDirection = 'column';
        box.style.justifyContent = 'flex-end';
      }

      // Paragraph-level font defaults from bodyPr / lstStyle
      const defSzRaw = +(txBody.querySelector('lstStyle defPPr rPr')?.getAttribute('sz') || 0);
      const defFontPx = defSzRaw ? defSzRaw / 100 * ptToPx : 14 * ptToPx;

      for (const para of txBody.querySelectorAll('p')) {
        const pPr  = para.querySelector('pPr');
        const algn = pPr?.getAttribute('algn');

        // Paragraph-level space before/after (in hundredths of a pt)
        const spcBef = +(pPr?.querySelector('spcBef spcPts')?.getAttribute('val') || 0);
        const spcAft = +(pPr?.querySelector('spcAft spcPts')?.getAttribute('val') || 0);

        const pEl = document.createElement('p');
        pEl.style.cssText =
          `margin:${spcBef/100*ptToPx*0.5}px 0 ${spcAft/100*ptToPx*0.5}px;` +
          `padding:0 3px;line-height:1.2;white-space:pre-wrap;` +
          (algn === 'ctr' ? 'text-align:center;' :
           algn === 'r'   ? 'text-align:right;'  :
           algn === 'dist'? 'text-align:justify;' : '');

        let hasText = false;
        for (const run of para.querySelectorAll('r')) {
          const rPr = run.querySelector('rPr');
          const tEl = run.querySelector('t');
          if (!tEl?.textContent) continue;
          hasText = true;

          const span = document.createElement('span');
          span.textContent = tEl.textContent;

          if (rPr) {
            const szRaw = +rPr.getAttribute('sz');
            const fPx   = szRaw ? szRaw / 100 * ptToPx : defFontPx;
            span.style.fontSize   = fPx + 'px';
            span.style.lineHeight = '1.2';
            if (rPr.getAttribute('b') === '1')    span.style.fontWeight     = 'bold';
            if (rPr.getAttribute('i') === '1')    span.style.fontStyle      = 'italic';
            if (rPr.getAttribute('u') === 'sng')  span.style.textDecoration = 'underline';
            if (rPr.getAttribute('strike') === 'sngStrike')
              span.style.textDecoration = 'line-through';
            const col = cssColor(rPr.querySelector('solidFill'));
            if (col) span.style.color = col;
            // Font family
            const latin = rPr.querySelector('latin');
            if (latin?.getAttribute('typeface'))
              span.style.fontFamily = `"${latin.getAttribute('typeface')}",Calibri,Arial,sans-serif`;
          } else {
            span.style.fontSize = defFontPx + 'px';
          }
          pEl.appendChild(span);
        }
        if (hasText) box.appendChild(pEl);
      }
      slide.appendChild(box);
    }

    document.body.appendChild(slide);

    await Promise.all(
      Array.from(slide.querySelectorAll('img')).map(img =>
        new Promise(res => { img.complete ? res() : (img.onload = img.onerror = res); })
      )
    );
    await delay(100);

    const cv = await html2canvas(slide, {
      scale:           1,
      width:           pxW,
      height:          pxH,
      backgroundColor: '#ffffff',
      useCORS:         false,
      allowTaint:      true,
      logging:         false,
    });
    document.body.removeChild(slide);

    pdf.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, mmW, mmH);
  }

  setProgress(96, 'Сохранение PDF…');
  const bytes = pdf.output('arraybuffer');
  setProgress(100, 'Готово!');
  return {
    blob: new Blob([bytes], { type: 'application/pdf' }),
    filename: base(file.name) + '.pdf',
    info: `${slideFiles.length} слайдов — дизайн сохранён`,
  };
}

/* ── 8. Excel → PDF ──────────────────────────────────────────────────────── */
async function doExcelToPdf(opts) {
  // ── CloudConvert first ────────────────────────────────────────────────────
  const ccResult = await tryCC(
    uploadedFiles[0], 'pdf',
    base(uploadedFiles[0].name) + '.pdf'
  );
  if (ccResult) return ccResult;

  // ── Browser fallback ──────────────────────────────────────────────────────
  if (typeof window.jspdf === 'undefined') throw new Error('jsPDF не загружен.');

  const file   = uploadedFiles[0];
  const ab     = await file.arrayBuffer();
  const orient = opts['xl-orient'] || 'l';

  setProgress(15, 'Чтение таблицы…');
  const wb = XLSX.read(ab, { type: 'array', cellText: true, cellDates: true });

  const { jsPDF } = window.jspdf;
  const isL  = orient === 'l';
  const pdf  = new jsPDF({ orientation: isL ? 'l' : 'p', unit: 'mm', format: 'a4' });
  const PW   = isL ? 297 : 210, PH = isL ? 210 : 297;
  const M    = 12, ROW_H = 7, MIN_COL = 18, MAX_COL = 60;
  let firstSheet = true;

  for (let si = 0; si < wb.SheetNames.length; si++) {
    setProgress(15 + (si / wb.SheetNames.length) * 75, `Лист: ${wb.SheetNames[si]}…`);
    const ws   = wb.Sheets[wb.SheetNames[si]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!data.length) continue;

    if (!firstSheet) pdf.addPage();
    firstSheet = false;

    const cols = Math.max(...data.map(r => r.length), 1);
    const rawW = (PW - M * 2) / cols;
    const colW = Math.max(MIN_COL, Math.min(rawW, MAX_COL));

    // Sheet title
    pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 30, 30);
    pdf.text(wb.SheetNames[si], M, M + 5);
    let y = M + 12;

    data.forEach((row, ri) => {
      if (y + ROW_H > PH - M) { pdf.addPage(); y = M; }

      const isHeader = ri === 0;
      if (isHeader) {
        pdf.setFillColor(33, 58, 140);
        pdf.rect(M, y - ROW_H + 1.5, cols * colW, ROW_H, 'F');
        pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5);
      } else {
        if (ri % 2 === 0) {
          pdf.setFillColor(245, 247, 252);
          pdf.rect(M, y - ROW_H + 1.5, cols * colW, ROW_H, 'F');
        }
        pdf.setTextColor(30, 30, 30); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5);
      }

      // Row grid line
      pdf.setDrawColor(210, 210, 210);
      pdf.line(M, y + 1.5, M + cols * colW, y + 1.5);

      for (let ci = 0; ci < cols; ci++) {
        const cx   = M + ci * colW;
        const raw  = row[ci] ?? '';
        const text = pdf.splitTextToSize(String(raw), colW - 3)[0] || '';
        if (ci > 0) pdf.line(cx, y - ROW_H + 1.5, cx, y + 1.5); // column divider
        pdf.text(text, cx + 2, y);
      }
      y += ROW_H;
    });
  }

  setProgress(96, 'Сохранение…');
  const bytes = pdf.output('arraybuffer');
  setProgress(100, 'Готово!');
  return {
    blob: new Blob([bytes], { type: 'application/pdf' }),
    filename: base(file.name) + '.pdf',
    info: `${wb.SheetNames.length} лист(ов) экспортировано`,
  };
}

/* ── 9. Merge PDF ────────────────────────────────────────────────────────── */
async function doMerge() {
  const { PDFDocument } = PDFLib;
  const merged = await PDFDocument.create();

  for (let i = 0; i < uploadedFiles.length; i++) {
    setProgress(5 + ((i + 1) / uploadedFiles.length) * 88, `Добавление файла ${i + 1}/${uploadedFiles.length}…`);
    const src   = await PDFDocument.load(await uploadedFiles[i].arrayBuffer());
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }

  setProgress(96, 'Сохранение…');
  const bytes = await merged.save();
  setProgress(100, 'Готово!');
  const totalPages = merged.getPageCount();
  return {
    blob: new Blob([bytes], { type: 'application/pdf' }),
    filename: 'merged.pdf',
    info: `${uploadedFiles.length} файлов, всего ${totalPages} страниц`,
  };
}

/* ── 10. Split PDF ───────────────────────────────────────────────────────── */
async function doSplit(opts) {
  const { PDFDocument } = PDFLib;
  const buf  = await uploadedFiles[0].arrayBuffer();
  const pdf  = await PDFDocument.load(buf);
  const n    = pdf.getPageCount();
  const bn   = base(uploadedFiles[0].name, '.pdf');
  const mode = opts['split-mode'] || 'all';

  let groups = mode === 'range' && opts.range?.trim()
    ? parseRanges(opts.range.trim(), n)
    : Array.from({ length: n }, (_, i) => [i]);

  if (!groups.length) throw new Error('Неверные диапазоны страниц.');

  if (groups.length === 1) {
    setProgress(55, 'Создание PDF…');
    const nd = await PDFDocument.create();
    (await nd.copyPages(pdf, groups[0])).forEach(p => nd.addPage(p));
    const bytes = await nd.save();
    setProgress(100, 'Готово!');
    const label = groups[0].map(i => i + 1).join('-');
    return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: `${bn}-p${label}.pdf` };
  }

  const zip = new JSZip();
  for (let g = 0; g < groups.length; g++) {
    setProgress(5 + ((g + 1) / groups.length) * 88, `Часть ${g + 1}/${groups.length}…`);
    const nd = await PDFDocument.create();
    (await nd.copyPages(pdf, groups[g])).forEach(p => nd.addPage(p));
    const label = groups[g].map(i => i + 1).join('-');
    zip.file(`${bn}-${pad(g + 1)}-p${label}.pdf`, await nd.save());
  }

  setProgress(96, 'Упаковка…');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  setProgress(100, 'Готово!');
  return {
    blob: zipBlob, filename: `${bn}-split.zip`,
    info: `${groups.length} частей в ZIP-архиве`,
  };
}

/* ── 11. Compress PDF ────────────────────────────────────────────────────── */
async function doCompress() {
  const { PDFDocument } = PDFLib;
  const buf  = await uploadedFiles[0].arrayBuffer();
  const orig = buf.byteLength;

  setProgress(18, 'Загрузка…');
  const pdf = await PDFDocument.load(buf);
  setProgress(50, 'Оптимизация метаданных…');
  ['Title','Author','Subject','Producer','Creator'].forEach(k => pdf['set' + k](''));
  pdf.setKeywords([]);

  setProgress(80, 'Сохранение…');
  const bytes = await pdf.save({ useObjectStreams: true });
  setProgress(100, 'Готово!');

  const saved  = orig - bytes.byteLength;
  const pct    = ((1 - bytes.byteLength / orig) * 100).toFixed(1);
  const bn     = base(uploadedFiles[0].name, '.pdf');
  return {
    blob: new Blob([bytes], { type: 'application/pdf' }),
    filename: `${bn}-compressed.pdf`,
    info: saved > 0
      ? `${fmtSize(orig)} → ${fmtSize(bytes.byteLength)} (−${pct}%)`
      : `Файл уже оптимизирован (${fmtSize(bytes.byteLength)})`,
  };
}

/* ── 12. Rotate PDF ──────────────────────────────────────────────────────── */
async function doRotate(opts) {
  const { PDFDocument, degrees } = PDFLib;
  const buf   = await uploadedFiles[0].arrayBuffer();
  const pdf   = await PDFDocument.load(buf);
  const angle = parseInt(opts.rotation || '90');
  const target = opts.pages || 'all';

  setProgress(40, 'Поворот страниц…');
  pdf.getPages().forEach((p, i) => {
    const rotate = target === 'all' || (target === 'odd' && i % 2 === 0) || (target === 'even' && i % 2 === 1);
    if (rotate) p.setRotation(degrees((p.getRotation().angle + angle) % 360));
  });

  setProgress(85, 'Сохранение…');
  const bytes = await pdf.save();
  setProgress(100, 'Готово!');
  const label = target === 'all' ? 'все' : target === 'odd' ? 'нечётные' : 'чётные';
  const bn    = base(uploadedFiles[0].name, '.pdf');
  return {
    blob: new Blob([bytes], { type: 'application/pdf' }),
    filename: `${bn}-rotated.pdf`,
    info: `Повёрнуто на ${angle}°: ${label} страницы`,
  };
}

/* ══════════════════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════════════════ */

async function canvasConvertToJpeg(file) {
  return new Promise(res => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = img.width; cv.height = img.height;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      cv.toBlob(b => b.arrayBuffer().then(res), 'image/jpeg', 0.92);
    };
    img.src = url;
  });
}

function groupIntoLines(items, tol = 4) {
  const lines = [];
  let cur = null;
  for (const it of items) {
    const y = it.transform[5];
    if (!cur || Math.abs(cur.y - y) > tol) { cur = { y, parts: [it] }; lines.push(cur); }
    else cur.parts.push(it);
  }
  lines.forEach(l => l.parts.sort((a, b) => a.transform[4] - b.transform[4]));
  return lines;
}

function clusterPositions(vals, tolerance) {
  const sorted = [...new Set(vals)].sort((a, b) => a - b);
  const clusters = [];
  for (const v of sorted) {
    if (!clusters.length || v - clusters[clusters.length - 1] > tolerance) clusters.push(v);
  }
  return clusters;
}

function nearestIndex(arr, val) {
  let best = 0, bestD = Infinity;
  arr.forEach((v, i) => { const d = Math.abs(v - val); if (d < bestD) { bestD = d; best = i; } });
  return best;
}

function parseRanges(str, total) {
  return str.split(',').map(s => s.trim()).filter(Boolean).flatMap(part => {
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number);
      const idxs = [];
      for (let i = Math.max(1, a); i <= Math.min(total, b); i++) idxs.push(i - 1);
      return idxs.length ? [idxs] : [];
    }
    const n = +part;
    return n >= 1 && n <= total ? [[n - 1]] : [];
  });
}

// Ждёт загрузки всех <img> внутри container
function imgLoadAll(container) {
  const imgs = Array.from(container.querySelectorAll('img'));
  if (!imgs.length) return Promise.resolve();
  return Promise.all(imgs.map(img =>
    new Promise(res => { img.complete ? res() : (img.onload = img.onerror = res); })
  ));
}

function emu2mm(emu)                      { return emu / 914400 * 25.4; }
function emuToPx(emu, totalEmu, totalPx) { return (emu / totalEmu) * totalPx; }
function slideNum(path)                   { return parseInt(path.match(/\d+/)[0]); }
function uint8ToBase64(u8) {
  let bin = '';
  u8.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin);
}

function showProgress(pct, text) {
  document.getElementById('progress-area').classList.remove('hidden');
  setProgress(pct, text);
}

function setProgress(pct, text) {
  document.getElementById('progress-fill').style.width = pct + '%';
  if (text) document.getElementById('progress-text').textContent = text;
}

function showResult({ blob, filename, info }) {
  document.getElementById('progress-area').classList.add('hidden');
  document.getElementById('result-area').classList.remove('hidden');
  revokeResult();
  resultObjectUrl = URL.createObjectURL(blob);
  const dl = document.getElementById('btn-download');
  dl.href = resultObjectUrl; dl.download = filename;
  document.getElementById('result-desc').textContent = info || `Готово: ${filename}`;
}

function revokeResult() {
  if (resultObjectUrl) { URL.revokeObjectURL(resultObjectUrl); resultObjectUrl = null; }
}

function base(filename, ext) {
  return ext
    ? filename.replace(new RegExp(ext.replace('.', '\\.') + '$', 'i'), '')
    : filename.replace(/\.[^.]+$/, '');
}

function pad(n, w = 3) { return String(n).padStart(w, '0'); }
function delay(ms) { return new Promise(res => setTimeout(res, ms)); }
function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function fmtSize(b) {
  if (b < 1024) return b + ' Б';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' КБ';
  return (b / 1048576).toFixed(2) + ' МБ';
}
function fileIcon(f) {
  const e = f.name.split('.').pop().toLowerCase();
  return { pdf:'📕',jpg:'🖼️',jpeg:'🖼️',png:'🖼️',webp:'🖼️',docx:'📝',doc:'📝',xlsx:'📊',xls:'📊',csv:'📊',pptx:'📋',ppt:'📋' }[e] || '📄';
}
function pluralFiles(n) {
  const r10 = n % 10, r100 = n % 100;
  if (r10 === 1 && r100 !== 11) return 'файл';
  if ([2,3,4].includes(r10) && ![12,13,14].includes(r100)) return 'файла';
  return 'файлов';
}
function pluralPages(n) {
  const r10 = n % 10, r100 = n % 100;
  if (r10 === 1 && r100 !== 11) return 'страница';
  if ([2,3,4].includes(r10) && ![12,13,14].includes(r100)) return 'страницы';
  return 'страниц';
}
