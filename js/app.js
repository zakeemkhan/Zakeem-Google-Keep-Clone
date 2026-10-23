/**
 * Keep Clone — application logic
 *
 * Structure:
 *   1. Constants & state
 *   2. Storage helpers (localStorage)
 *   3. Note operations (create / update / archive / delete)
 *   4. Rendering
 *   5. Modal, toast, composer
 *   6. Event wiring
 *   7. Init
 */
(function () {
  'use strict';

  /* ---------- 1. Constants & state ---------- */
  const STORAGE_KEY = 'keep-clone:notes';
  const PREFS_KEY = 'keep-clone:prefs';
  const COLORS = ['default', 'yellow', 'orange', 'red', 'green', 'teal', 'blue', 'purple', 'pink'];
  const COLOR_HEX = {
    default: '#ffffff', yellow: '#fff475', orange: '#fbbc04', red: '#f28b82',
    green: '#ccff90', teal: '#a7ffeb', blue: '#aecbfa', purple: '#d7aefb', pink: '#fdcfe8'
  };

  const state = {
    notes: [],
    view: 'notes',        // 'notes' | 'archive'
    query: '',
    composerColor: 'default',
    editingId: null,
    lastRemoved: null,    // for undo
    toastTimer: null
  };

  /** Shorthand for getElementById. */
  const $ = (id) => document.getElementById(id);

  const el = {
    form: $('note-form'), composer: $('composer'),
    title: $('note-title'), body: $('note-body'),
    toolbar: $('composer-toolbar'), cancel: $('composer-cancel'),
    composerColors: $('composer-colors'),
    container: $('notes-container'), sectionTitle: $('section-title'),
    empty: $('empty-state'), emptyIcon: $('empty-icon'), emptyText: $('empty-text'),
    search: $('search-input'),
    sidebar: $('sidebar'), menuToggle: $('menu-toggle'),
    navButtons: document.querySelectorAll('.sidebar__item'),
    countNotes: $('count-notes'), countArchive: $('count-archive'),
    viewToggle: $('view-toggle'), viewIcon: $('view-toggle-icon'),
    themeToggle: $('theme-toggle'), themeIcon: $('theme-toggle-icon'),
    modal: $('note-modal'), modalDialog: $('modal-dialog'),
    modalTitle: $('modal-title'), modalBody: $('modal-body'),
    modalColors: $('modal-colors'), modalMeta: $('modal-meta'), modalClose: $('modal-close'),
    toast: $('toast'), toastMessage: $('toast-message'), toastUndo: $('toast-undo')
  };

  /* ---------- 2. Storage helpers ---------- */
  function loadNotes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('Could not read saved notes:', err);
      return [];
    }
  }

  function saveNotes() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notes));
    } catch (err) {
      console.warn('Could not save notes:', err);
    }
  }

  function loadPrefs() {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; }
    catch (err) { return {}; }
  }

  function savePrefs(patch) {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ ...loadPrefs(), ...patch })); }
    catch (err) { /* ignore */ }
  }

  /* ---------- 3. Note operations ---------- */
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function findNote(id) {
    return state.notes.find((n) => n.id === id);
  }

  /** Create a note. Returns null if both fields are empty. */
  function addNote({ title, body, color }) {
    title = title.trim();
    body = body.trim();
    if (!title && !body) return null;

    const now = Date.now();
    const note = { id: generateId(), title, body, color, archived: false, createdAt: now, updatedAt: now };
    state.notes.unshift(note);
    saveNotes();
    return note;
  }

  function updateNote(id, changes) {
    const note = findNote(id);
    if (!note) return;
    Object.assign(note, changes, { updatedAt: Date.now() });
    saveNotes();
  }

  function toggleArchive(id) {
    const note = findNote(id);
    if (!note) return;
    note.archived = !note.archived;
    note.updatedAt = Date.now();
    saveNotes();
    showToast(note.archived ? 'Note archived' : 'Note unarchived', () => toggleArchive(id));
    render();
  }

  function deleteNote(id) {
    const index = state.notes.findIndex((n) => n.id === id);
    if (index === -1) return;
    const [removed] = state.notes.splice(index, 1);
    saveNotes();
    showToast('Note deleted', () => {
      state.notes.splice(index, 0, removed);
      saveNotes();
      render();
    });
    render();
  }

  /* ---------- 4. Rendering ---------- */
  /** Escape user text before inserting into HTML. */
  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /** Escape then wrap search matches in <mark>. */
  function highlight(text) {
    const safe = escapeHtml(text);
    if (!state.query) return safe;
    const pattern = escapeHtml(state.query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return safe.replace(new RegExp(`(${pattern})`, 'gi'), '<mark>$1</mark>');
  }

  function getVisibleNotes() {
    const q = state.query.toLowerCase();
    return state.notes.filter((n) => {
      if ((state.view === 'archive') !== n.archived) return false;
      return !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
    });
  }

  function buildNoteCard(note) {
    const card = document.createElement('article');
    card.className = `note color-${note.color}`;
    card.dataset.id = note.id;
    card.tabIndex = 0;
    card.setAttribute('aria-label', `Note: ${note.title || 'Untitled'}. Press Enter to edit.`);

    const archiveLabel = note.archived ? 'Unarchive' : 'Archive';
    const archiveIcon = note.archived ? '&#128228;' : '&#128230;';

    card.innerHTML = `
      ${note.title ? `<h3 class="note__title">${highlight(note.title)}</h3>` : ''}
      ${note.body ? `<p class="note__body">${highlight(note.body)}</p>` : ''}
      <div class="note__actions">
        <button class="icon-btn" data-action="archive" data-tooltip="${archiveLabel}" aria-label="${archiveLabel} note">${archiveIcon}</button>
        <button class="icon-btn" data-action="delete" data-tooltip="Delete" aria-label="Delete note">&#128465;</button>
      </div>`;
    return card;
  }

  function render() {
    const visible = getVisibleNotes();
    el.container.replaceChildren(...visible.map(buildNoteCard));

    // Counts
    el.countNotes.textContent = state.notes.filter((n) => !n.archived).length;
    el.countArchive.textContent = state.notes.filter((n) => n.archived).length;

    // Heading + composer visibility
    const isArchive = state.view === 'archive';
    el.sectionTitle.textContent = state.query ? `Search results (${visible.length})` : (isArchive ? 'Archive' : 'Notes');
    el.composer.hidden = isArchive;

    // Empty state
    el.empty.hidden = visible.length > 0;
    if (!visible.length) {
      if (state.query) { el.emptyIcon.textContent = '\u{1F50D}'; el.emptyText.textContent = 'No matching notes found'; }
      else if (isArchive) { el.emptyIcon.textContent = '\u{1F4E6}'; el.emptyText.textContent = 'Your archived notes appear here'; }
      else { el.emptyIcon.textContent = '\u{1F4A1}'; el.emptyText.textContent = 'Notes you add appear here'; }
    }

    // Sidebar active state
    el.navButtons.forEach((btn) => {
      const active = btn.dataset.view === state.view;
      btn.classList.toggle('is-active', active);
      if (active) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
    });
  }

  /** Build a row of colour swatches inside `container`. */
  function buildColorPicker(container, getColor, onPick) {
    container.replaceChildren();
    COLORS.forEach((color) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'color-swatch';
      btn.style.background = COLOR_HEX[color];
      btn.dataset.color = color;
      btn.dataset.tooltip = color.charAt(0).toUpperCase() + color.slice(1);
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-label', color);
      btn.addEventListener('click', () => { onPick(color); syncSwatches(container, color); });
      container.appendChild(btn);
    });
    syncSwatches(container, getColor());
  }

  function syncSwatches(container, selected) {
    container.querySelectorAll('.color-swatch').forEach((btn) => {
      const on = btn.dataset.color === selected;
      btn.classList.toggle('is-selected', on);
      btn.setAttribute('aria-checked', on);
    });
  }

  /* ---------- 5. Composer, modal, toast ---------- */
  function openComposer() {
    el.composer.classList.add('is-open');
    el.title.hidden = false;
    el.toolbar.hidden = false;
    autoGrow(el.body);
  }

  function closeComposer() {
    el.form.reset();
    state.composerColor = 'default';
    syncSwatches(el.composerColors, 'default');
    applyComposerColor();
    el.composer.classList.remove('is-open');
    el.title.hidden = true;
    el.toolbar.hidden = true;
    el.body.style.height = '';
  }

  function applyComposerColor() {
    COLORS.forEach((c) => el.composer.classList.remove(`color-${c}`));
    el.composer.classList.add(`color-${state.composerColor}`);
  }

  function autoGrow(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  let lastFocused = null;

  function openModal(id) {
    const note = findNote(id);
    if (!note) return;
    state.editingId = id;
    lastFocused = document.activeElement;

    el.modalTitle.value = note.title;
    el.modalBody.value = note.body;
    el.modalMeta.textContent = `Edited ${new Date(note.updatedAt).toLocaleString()}`;
    setModalColor(note.color);
    buildColorPicker(el.modalColors, () => note.color, (color) => {
      updateNote(id, { color });
      setModalColor(color);
      render();
    });

    el.modal.hidden = false;
    document.body.style.overflow = 'hidden';
    el.modalBody.focus();
  }

  function setModalColor(color) {
    COLORS.forEach((c) => el.modalDialog.classList.remove(`color-${c}`));
    el.modalDialog.classList.add(`color-${color}`);
  }

  function closeModal() {
    if (el.modal.hidden) return;
    const note = findNote(state.editingId);
    if (note) {
      const title = el.modalTitle.value.trim();
      const body = el.modalBody.value.trim();
      if (!title && !body) {
        deleteNote(note.id);               // empty notes are removed
      } else if (title !== note.title || body !== note.body) {
        updateNote(note.id, { title, body });
        render();
      }
    }
    state.editingId = null;
    el.modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  function showToast(message, undoFn) {
    clearTimeout(state.toastTimer);
    el.toastMessage.textContent = message;
    state.lastRemoved = undoFn || null;
    el.toastUndo.hidden = !undoFn;
    el.toast.hidden = false;
    state.toastTimer = setTimeout(hideToast, 5000);
  }

  function hideToast() {
    el.toast.hidden = true;
    state.lastRemoved = null;
  }

  /* ---------- 6. Event wiring ---------- */
  function wireEvents() {
    // Composer: expand on focus, grow while typing
    el.body.addEventListener('focus', openComposer);
    el.body.addEventListener('input', () => autoGrow(el.body));

    el.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const note = addNote({ title: el.title.value, body: el.body.value, color: state.composerColor });
      if (note) { render(); showToast('Note added'); }
      closeComposer();
    });
    el.cancel.addEventListener('click', closeComposer);

    // Click outside the composer saves (like Keep) when it has content, otherwise just closes
    document.addEventListener('click', (e) => {
      if (el.composer.classList.contains('is-open') && !el.composer.contains(e.target)) {
        el.form.requestSubmit();
      }
    });

    // Note cards (event delegation)
    el.container.addEventListener('click', (e) => {
      const card = e.target.closest('.note');
      if (!card) return;
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        e.stopPropagation();
        const id = card.dataset.id;
        if (actionBtn.dataset.action === 'archive') {
          card.classList.add('is-removing');
          setTimeout(() => toggleArchive(id), 180);
        } else if (actionBtn.dataset.action === 'delete') {
          card.classList.add('is-removing');
          setTimeout(() => deleteNote(id), 180);
        }
        return;
      }
      openModal(card.dataset.id);
    });

    el.container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.classList.contains('note')) openModal(e.target.dataset.id);
    });

    // Modal
    el.modalClose.addEventListener('click', closeModal);
    el.modal.addEventListener('click', (e) => { if (e.target.hasAttribute('data-close-modal')) closeModal(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!el.modal.hidden) closeModal();
        else if (el.composer.classList.contains('is-open')) el.form.requestSubmit();
      }
    });

    // Search
    el.search.addEventListener('input', () => { state.query = el.search.value.trim(); render(); });

    // Sidebar navigation
    el.navButtons.forEach((btn) => btn.addEventListener('click', () => {
      state.view = btn.dataset.view;
      el.sidebar.classList.remove('is-open');
      render();
    }));
    el.menuToggle.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 800px)').matches) el.sidebar.classList.toggle('is-open');
      else el.sidebar.classList.toggle('is-collapsed');
    });

    // Grid / list toggle
    el.viewToggle.addEventListener('click', () => {
      const list = !el.container.classList.contains('is-list');
      applyLayout(list);
      savePrefs({ list });
    });

    // Theme toggle
    el.themeToggle.addEventListener('click', () => {
      const dark = document.documentElement.dataset.theme !== 'dark';
      applyTheme(dark);
      savePrefs({ dark });
    });

    // Toast undo
    el.toastUndo.addEventListener('click', () => {
      if (state.lastRemoved) state.lastRemoved();
      hideToast();
    });
  }

  function applyLayout(list) {
    el.container.classList.toggle('is-list', list);
    el.viewIcon.innerHTML = list ? '&#9638;' : '&#9776;';
    el.viewToggle.dataset.tooltip = list ? 'Grid view' : 'List view';
  }

  function applyTheme(dark) {
    if (dark) document.documentElement.dataset.theme = 'dark';
    else delete document.documentElement.dataset.theme;
    el.themeIcon.innerHTML = dark ? '&#9788;' : '&#9790;';
    el.themeToggle.dataset.tooltip = dark ? 'Light mode' : 'Dark mode';
  }

  /* ---------- 7. Init ---------- */
  function init() {
    state.notes = loadNotes();

    const prefs = loadPrefs();
    applyTheme(Boolean(prefs.dark));
    applyLayout(Boolean(prefs.list));

    buildColorPicker(el.composerColors, () => state.composerColor, (color) => {
      state.composerColor = color;
      applyComposerColor();
    });
    applyComposerColor();

    wireEvents();
    render();
  }

  init();
})();
