/**
 * CONTESTE.INFO - JavaScript principal
 * Portal diario de inscricoes abertas (Cultura, Educacao, Esportes, Trabalho).
 * Sem imagens, sem dependencias externas, com navegacao por dia.
 */
'use strict';

const CONFIG = {
  DATA_URL: 'data/oportunidades.json',
  ITEMS_PER_PAGE: 12,
  TOP_PER_CATEGORY: 4,
  BUTTONDOWN_USERNAME: 'SEU_USUARIO_BUTTONDOWN',
  CATEGORIES: [
    { key: 'cultura',  label: 'Cultura',  emoji: '\uD83C\uDFA8' },
    { key: 'educacao', label: 'Educa\u00e7\u00e3o', emoji: '\uD83D\uDCDA' },
    { key: 'esportes', label: 'Esportes', emoji: '\u26BD' },
    { key: 'trabalho', label: 'Trabalho', emoji: '\uD83D\uDCBC' }
  ],
  STATUS_LABEL: {
    open: 'Inscri\u00e7\u00f5es abertas',
    continuous: 'Vagas cont\u00ednuas',
    coming_soon: 'Em breve',
    extended: 'Prazo prorrogado',
    closed: 'Encerrada'
  }
};

const state = {
  all: [],
  generatedAt: null,
  view: 'home',
  category: null,
  page: 1,
  search: '',
  status: 'open',
  isFree: false,
  sort: 'newest',
  day: 'all'
};

document.addEventListener('DOMContentLoaded', init);

function init() {
  const body = document.body;
  state.view = body.dataset.view || 'home';
  state.category = body.dataset.category || null;

  initMobileMenu();
  initScrollEffects();
  initScrollAnimations();
  initPremiumLink();
  loadData();
}

/* ------------------------------------------------------------------ */
/* Dados                                                               */
/* ------------------------------------------------------------------ */
async function loadData() {
  try {
    const res = await fetch(CONFIG.DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    state.generatedAt = data.generated_at || null;
    state.all = (data.opportunities || []).map(normalize);
    renderPage();
  } catch (err) {
    console.error(err);
    const target = document.getElementById('categoryPreviews') || document.getElementById('listGrid');
    if (target) target.innerHTML = '<p class="empty">N\u00e3o foi poss\u00edvel carregar as oportunidades. Recarregue a p\u00e1gina.</p>';
  }
}

function normalize(item) {
  const pub = (item.published_date || item.created_at || '').slice(0, 10);
  const dl = item.deadline_date || null;
  return Object.assign({}, item, {
    published_date: pub,
    daysLeft: dl ? daysBetween(todayISO(), dl) : null
  });
}

function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

/* ------------------------------------------------------------------ */
/* Renderizacao                                                        */
/* ------------------------------------------------------------------ */
function renderPage() {
  renderUpdatedBar();
  renderDayBar();
  if (state.view === 'category') {
    renderFilters();
    renderList();
  } else {
    renderCategoryPreviews();
  }
}

function renderUpdatedBar() {
  const el = document.getElementById('updatedBar');
  if (!el) return;
  const openCount = state.all.filter(isOpen).length;
  const when = state.generatedAt ? formatDate(state.generatedAt.slice(0, 10)) : 'hoje';
  el.innerHTML = '<span class="updated-dot" aria-hidden="true"></span>' +
    '<span>Atualizado em <strong>' + when + '</strong></span>' +
    '<span class="updated-sep">\u00b7</span>' +
    '<span><strong>' + openCount + '</strong> oportunidades abertas</span>';
}

function openDates() {
  const map = {};
  state.all.filter(isOpen).forEach(function (i) {
    if (!i.published_date) return;
    map[i.published_date] = (map[i.published_date] || 0) + 1;
  });
  return Object.keys(map).sort().reverse().map(function (d) {
    return { date: d, count: map[d] };
  });
}

function renderDayBar() {
  const el = document.getElementById('dayBar');
  if (!el) return;
  const dates = openDates();
  if (dates.length <= 1) { el.innerHTML = ''; return; }

  const opts = ['<option value="all">Todas as datas</option>'].concat(
    dates.map(function (d) {
      return '<option value="' + d.date + '">' + formatDate(d.date) + ' (' + d.count + ')</option>';
    })
  ).join('');

  el.innerHTML =
    '<label class="daybar-label" for="daySelect">Filtrar por dia:</label>' +
    '<select id="daySelect" class="daybar-select">' + opts + '</select>';
  const sel = document.getElementById('daySelect');
  sel.value = state.day;
  sel.addEventListener('change', function () {
    state.day = this.value;
    state.page = 1;
    if (state.view === 'category') renderList();
    else renderCategoryPreviews();
  });
}

function renderCategoryPreviews() {
  const el = document.getElementById('categoryPreviews');
  if (!el) return;
  el.innerHTML = CONFIG.CATEGORIES.map(function (cat) {
    const items = filtered({ category: cat.key, ignoreCategory: true });
    const cards = items.slice(0, CONFIG.TOP_PER_CATEGORY).map(cardHTML).join('');
    const body = cards || '<p class="empty">Nenhuma oportunidade em aberto no momento.</p>';
    return '<section class="category-section" id="' + cat.key + '">' +
        '<div class="category-header">' +
          '<h2 class="category-title"><span class="category-emoji">' + cat.emoji + '</span> ' + cat.label +
            ' <span class="category-count">' + items.length + '</span></h2>' +
          '<a href="' + cat.key + '.html" class="see-more">Veja mais \u2192</a>' +
        '</div>' +
        '<div class="news-grid">' + body + '</div>' +
      '</section>';
  }).join('');
}

function renderFilters() {
  const el = document.getElementById('filters');
  if (!el || el.dataset.ready) return;
  el.dataset.ready = '1';
  el.innerHTML =
    '<div class="filters-row">' +
      '<input type="search" id="searchInput" class="filter-input" placeholder="Buscar por t\u00edtulo, fonte ou palavra-chave" aria-label="Buscar">' +
      '<select id="statusFilter" class="filter-select" aria-label="Situa\u00e7\u00e3o">' +
        '<option value="open">Inscri\u00e7\u00f5es abertas</option>' +
        '<option value="continuous">Vagas cont\u00ednuas</option>' +
        '<option value="all">Todas as situa\u00e7\u00f5es</option>' +
        '<option value="closed">Encerradas</option>' +
      '</select>' +
      '<select id="sortFilter" class="filter-select" aria-label="Ordenar">' +
        '<option value="newest">Mais recentes</option>' +
        '<option value="deadline">Prazo terminando</option>' +
        '<option value="title">T\u00edtulo (A-Z)</option>' +
      '</select>' +
      '<label class="filter-check"><input type="checkbox" id="freeFilter"> Somente gratuitas</label>' +
      '<button type="button" id="clearFilters" class="filter-clear">Limpar</button>' +
    '</div>';

  document.getElementById('searchInput').addEventListener('input', debounce(function (e) {
    state.search = e.target.value.trim().toLowerCase(); state.page = 1; renderList();
  }, 200));
  document.getElementById('statusFilter').addEventListener('change', function () {
    state.status = this.value; state.page = 1; renderList();
  });
  document.getElementById('sortFilter').addEventListener('change', function () {
    state.sort = this.value; state.page = 1; renderList();
  });
  document.getElementById('freeFilter').addEventListener('change', function () {
    state.isFree = this.checked; state.page = 1; renderList();
  });
  document.getElementById('clearFilters').addEventListener('click', function () {
    state.search = ''; state.status = 'open'; state.sort = 'newest'; state.isFree = false; state.day = 'all'; state.page = 1;
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = 'open';
    document.getElementById('sortFilter').value = 'newest';
    document.getElementById('freeFilter').checked = false;
    renderDayBar(); renderList();
  });
}

function renderList() {
  const grid = document.getElementById('listGrid');
  const info = document.getElementById('resultsInfo');
  const pager = document.getElementById('pagination');
  if (!grid) return;

  const items = filtered({});
  const pages = Math.max(1, Math.ceil(items.length / CONFIG.ITEMS_PER_PAGE));
  if (state.page > pages) state.page = pages;
  const start = (state.page - 1) * CONFIG.ITEMS_PER_PAGE;
  const slice = items.slice(start, start + CONFIG.ITEMS_PER_PAGE);

  grid.innerHTML = slice.length
    ? slice.map(cardHTML).join('')
    : '<p class="empty">Nenhuma oportunidade encontrada com os filtros atuais.</p>';

  if (info) info.textContent = items.length + ' oportunidade(s) encontrada(s)';
  if (pager) pager.innerHTML = items.length > CONFIG.ITEMS_PER_PAGE ? paginationHTML(pages) : '';
  if (pager) bindPagination();
}

function paginationHTML(pages) {
  let out = '<button type="button" class="page-btn" data-page="prev"' + (state.page === 1 ? ' disabled' : '') + '>\u2190 Anterior</button>';
  out += '<span class="page-info">P\u00e1gina ' + state.page + ' de ' + pages + '</span>';
  out += '<button type="button" class="page-btn" data-page="next"' + (state.page === pages ? ' disabled' : '') + '>Pr\u00f3xima \u2192</button>';
  return out;
}

function bindPagination() {
  const pager = document.getElementById('pagination');
  if (!pager) return;
  pager.querySelectorAll('.page-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (this.dataset.page === 'prev' && state.page > 1) state.page--;
      if (this.dataset.page === 'next') state.page++;
      renderList();
      const top = document.getElementById('oportunidades');
      if (top) top.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

/* ------------------------------------------------------------------ */
/* Card e filtragem                                                    */
/* ------------------------------------------------------------------ */
function cardHTML(item) {
  const cat = CONFIG.CATEGORIES.filter(function (c) { return c.key === item.category; })[0] ||
    { label: item.category || '', emoji: '' };
  const statusLabel = CONFIG.STATUS_LABEL[item.status] || CONFIG.STATUS_LABEL.open;
  const badges = [];
  if (isNew(item)) badges.push('<span class="badge badge-new">Novo</span>');
  if (item.daysLeft !== null && item.daysLeft >= 0 && item.daysLeft <= 3) {
    badges.push('<span class="badge badge-soon">Encerra em ' + item.daysLeft + (item.daysLeft === 1 ? ' dia' : ' dias') + '</span>');
  }
  if (item.is_free === true) badges.push('<span class="badge badge-free">Gratuito</span>');

  const link = escapeHtml(item.official_link || '#');
  const meta = [];
  if (item.deadline) meta.push('<li><span class="meta-k">Prazo</span><span class="meta-v">' + escapeHtml(item.deadline) + '</span></li>');
  if (item.location) meta.push('<li><span class="meta-k">Local</span><span class="meta-v">' + escapeHtml(item.location) + '</span></li>');
  if (item.source_name) meta.push('<li><span class="meta-k">Fonte</span><span class="meta-v">' + escapeHtml(item.source_name) + '</span></li>');

  return '<article class="card">' +
      '<div class="card-top">' +
        '<span class="card-cat cat-' + escapeHtml(item.category) + '">' + cat.emoji + ' ' + cat.label + '</span>' +
        '<span class="card-badges">' + badges.join('') + '</span>' +
      '</div>' +
      '<h3 class="card-title"><a href="' + link + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(item.title) + '</a></h3>' +
      '<p class="card-desc">' + escapeHtml(item.short_description) + '</p>' +
      '<ul class="card-meta">' + meta.join('') + '</ul>' +
      '<div class="card-foot">' +
        '<span class="card-status status-' + escapeHtml(item.status) + '">' + statusLabel + '</span>' +
        '<a class="card-cta" href="' + link + '" target="_blank" rel="noopener noreferrer">Inscreva-se \u2192</a>' +
      '</div>' +
    '</article>';
}

function filtered(opts) {
  opts = opts || {};
  const cat = opts.ignoreCategory ? opts.category : (opts.category || state.category);
  const out = state.all.filter(function (i) {
    if (cat && i.category !== cat) return false;
    if (state.day !== 'all' && i.published_date !== state.day) return false;
    if (state.search) {
      const hay = [i.title, i.short_description, i.source_name, i.location, (i.tags || []).join(' ')]
        .join(' ').toLowerCase();
      if (hay.indexOf(state.search) === -1) return false;
    }
    if (state.status === 'open') { if (!isOpen(i)) return false; }
    else if (state.status !== 'all' && i.status !== state.status) return false;
    if (state.isFree && i.is_free !== true) return false;
    return true;
  });
  return sortItems(out);
}

function sortItems(arr) {
  const copy = arr.slice();
  if (state.sort === 'title') {
    copy.sort(function (a, b) { return (a.title || '').localeCompare(b.title || '', 'pt-BR'); });
  } else if (state.sort === 'deadline') {
    copy.sort(function (a, b) { return (a.deadline_date || '9999-99-99').localeCompare(b.deadline_date || '9999-99-99'); });
  } else {
    copy.sort(function (a, b) { return (b.published_date || '').localeCompare(a.published_date || ''); });
  }
  return copy;
}

function isOpen(i) {
  return i.status === 'open' || i.status === 'continuous' || i.status === 'extended';
}

function isNew(i) {
  return i.published_date === todayISO();
}

/* ------------------------------------------------------------------ */
/* Utilitarios                                                         */
/* ------------------------------------------------------------------ */
function pad(n) { return (n < 10 ? '0' : '') + n; }

function formatDate(iso) {
  if (!iso) return '';
  const p = String(iso).slice(0, 10).split('-');
  if (p.length !== 3) return iso;
  return p[2] + '/' + p[1] + '/' + p[0];
}

function daysBetween(a, b) {
  const d1 = new Date(a + 'T00:00:00');
  const d2 = new Date(b + 'T00:00:00');
  return Math.round((d2 - d1) / 86400000);
}

function debounce(fn, ms) {
  let t;
  return function () {
    const ctx = this, args = arguments;
    clearTimeout(t);
    t = setTimeout(function () { fn.apply(ctx, args); }, ms);
  };
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* ------------------------------------------------------------------ */
/* Interacoes gerais                                                   */
/* ------------------------------------------------------------------ */
function initMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const nav = document.getElementById('nav');
  if (!btn || !nav) return;

  btn.addEventListener('click', function () {
    const open = nav.classList.toggle('active');
    btn.classList.toggle('active', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
  });

  nav.querySelectorAll('.nav-link').forEach(function (link) {
    link.addEventListener('click', function () {
      nav.classList.remove('active');
      btn.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });
}

function initScrollEffects() {
  const header = document.getElementById('header');
  if (!header) return;
  const onScroll = function () {
    header.classList.toggle('scrolled', window.pageYOffset > 50);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initScrollAnimations() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('visible'); });
    return;
  }
  const obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  targets.forEach(function (el) { obs.observe(el); });
}

function initPremiumLink() {
  const el = document.getElementById('premiumSubscribeLink');
  const user = CONFIG.BUTTONDOWN_USERNAME;
  if (el && user && user !== 'SEU_USUARIO_BUTTONDOWN') {
    el.href = 'https://buttondown.com/' + user;
  }
  const form = document.getElementById('newsletterForm');
  if (form && user && user !== 'SEU_USUARIO_BUTTONDOWN') {
    form.action = 'https://buttondown.com/api/emails/embed-subscribe/' + user;
  }
}



