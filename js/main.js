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
  /* Palavras em destaque na busca (taxonomia do portal) */
  SUGESTOES: ['Vaga', 'Evento', 'Curso', 'Atividade', 'Brasil', 'Inscrições', 'Gratuito'],
  /* Kickers por area - iguais aos das imagens sociais */
  KICKERS: {
    cultura: 'Editais \u00b7 Forma\u00e7\u00e3o \u00b7 Participa\u00e7\u00e3o',
    educacao: 'Cursos \u00b7 Sele\u00e7\u00f5es \u00b7 Forma\u00e7\u00e3o',
    esportes: 'Projetos \u00b7 Sele\u00e7\u00f5es \u00b7 Vagas',
    trabalho: 'Vagas \u00b7 Programas \u00b7 Carreiras'
  },
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
  sort: 'deadline',
  day: 'all'
};

document.addEventListener('DOMContentLoaded', init);

function init() {
  state.view = 'home';
  state.category = categoriaDoHash();

  initMobileMenu();
  initScrollEffects();
  initScrollAnimations();
  initPremiumLink();
  renderSearchBar();
  initAssina();
  window.addEventListener('hashchange', function () {
    state.category = categoriaDoHash();
    state.page = 1;
    const sel = document.getElementById('catSelect');
    if (sel) sel.value = state.category || 'todos';
    renderList();
    atualizaContadorBusca();
  });
  loadData();
}

/* Categoria vinda do endereco: index.html#trabalho */
function categoriaDoHash() {
  const h = String(location.hash || '').replace('#', '');
  return ['cultura', 'educacao', 'esportes', 'trabalho'].indexOf(h) >= 0 ? h : null;
}

function renderHeaderLive() {
  const el = document.getElementById('headerLive');
  if (!el) return;
  const g = String(state.generatedAt || '');
  const dia = g ? formatDate(g.slice(0, 10)) : 'hoje';
  const hora = g.length >= 16 ? g.slice(11, 16) : '';
  el.innerHTML = '<span class="updated-dot" aria-hidden="true"></span> atualizado ' +
    (dia === formatDate(todayISO()) ? 'hoje' : dia) + (hora ? ' \u00e0s ' + hora : '');
}

/* ------------------------------------------------------------------ */
/* Barra de busca (fixa) + contador                                    */
/* ------------------------------------------------------------------ */
function renderSearchBar() {
  const el = document.getElementById('searchbar');
  if (!el || el.dataset.ready) return;
  el.dataset.ready = '1';

  const temInfo = !!document.getElementById('resultsInfo');
  const cats = CONFIG.CATEGORIES.map(function (c) {
    return '<option value="' + c.key + '">' + c.label + '</option>';
  }).join('');

  el.innerHTML = '<div class="container">' +
      '<div class="srow">' +
        '<label class="sfield" for="searchInput">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
          '<input id="searchInput" type="search" autocomplete="off" placeholder="Busque por cargo, \u00e1rea, modalidade, linguagem, cidade ou \u00f3rg\u00e3o\u2026" aria-label="Buscar oportunidades">' +
          '<button class="clear" id="clearSearch" type="button" hidden>Limpar</button>' +
        '</label>' +
        (state.view === 'category' ? '' :
          '<select class="sel" id="catSelect" aria-label="Filtrar por categoria">' +
            '<option value="todos">Todas as categorias</option>' + cats +
          '</select>') +
      '</div>' +
      (temInfo ? '' :
        '<div class="srow" id="resRow" style="margin-top:0.5rem" hidden><span class="sres" id="searchRes"></span></div>') +
      '<div class="quick" id="quick">' +
        CONFIG.SUGESTOES.map(function (s) {
          return '<button type="button" data-q="' + s + '">' + s + '</button>';
        }).join('') +
      '</div>' +
    '</div>';

  const input = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearch');

  function aplicaBusca(valor) {
    input.value = valor;
    state.search = valor;
    state.page = 1;
    clearBtn.hidden = !valor;
    if (state.view === 'category') renderList(); else renderCategoryPreviews();
    atualizaContadorBusca();
  }

  input.addEventListener('input', debounce(function () { aplicaBusca(input.value.trim()); }, 150));
  clearBtn.addEventListener('click', function () { aplicaBusca(''); input.focus(); });

  const sel = document.getElementById('catSelect');
  if (sel) {
    sel.value = state.category || 'todos';
    sel.addEventListener('change', function () {
      state.category = this.value === 'todos' ? null : this.value;
      state.page = 1;
      if (history.replaceState) {
        history.replaceState(null, '', state.category ? '#' + state.category : location.pathname + location.search);
      }
      renderList();
      atualizaContadorBusca();
    });
  }

  el.querySelectorAll('#quick button').forEach(function (b) {
    b.addEventListener('click', function () {
      aplicaBusca(b.dataset.q);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function atualizaContadorBusca() {
  const res = document.getElementById('searchRes');
  const row = document.getElementById('resRow');
  if (!res || !row) return;
  const ts = termosBusca();
  if (!ts.length) { row.hidden = true; res.innerHTML = ''; return; }
  const n = filtered({}).length;
  row.hidden = false;
  res.innerHTML = '<b>' + n + '</b> ' + (n === 1 ? 'oportunidade encontrada' : 'oportunidades encontradas') +
    ' para \u201c' + escapeHtml(state.search) + '\u201d';
}

/* ------------------------------------------------------------------ */
/* Faixa de assinatura (topo): alternancia de canal + envio            */
/* ------------------------------------------------------------------ */
function initAssina() {
  const campo = document.getElementById('campoTopo');
  const cEmail = document.getElementById('cEmail');
  const cWhats = document.getElementById('cWhats');
  const micro = document.getElementById('microTopo');
  if (!campo || !cEmail || !cWhats) return;

  function canal(qual) {
    const email = qual === 'email';
    cEmail.classList.toggle('on', email);
    cWhats.classList.toggle('on', !email);
    cEmail.setAttribute('aria-pressed', email ? 'true' : 'false');
    cWhats.setAttribute('aria-pressed', email ? 'false' : 'true');
    campo.type = email ? 'email' : 'tel';
    campo.placeholder = email ? 'Seu melhor e-mail' : 'WhatsApp com DDD';
    campo.value = '';
    campo.focus();
  }
  cEmail.addEventListener('click', function () { canal('email'); });
  cWhats.addEventListener('click', function () { canal('whats'); });

  const form = document.getElementById('formTopo');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const v = campo.value.trim();
    if (!v) {
      micro.classList.remove('ok');
      micro.style.color = '#DC2626';
      micro.textContent = 'Digite seu ' + (campo.type === 'email' ? 'e-mail' : 'WhatsApp com DDD') + ' para assinar.';
      campo.focus();
      return;
    }
    micro.classList.add('ok');
    micro.style.color = '';
    micro.textContent = 'Pronto! Vamos te avisar das oportunidades abertas.';
    campo.value = '';
  });
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
  renderHeaderLive();
  renderFilters();
  renderList();
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
      '<select id="statusFilter" class="filter-select" aria-label="Situa\u00e7\u00e3o">' +
        '<option value="open">Inscri\u00e7\u00f5es abertas</option>' +
        '<option value="continuous">Vagas cont\u00ednuas</option>' +
        '<option value="all">Todas as situa\u00e7\u00f5es</option>' +
        '<option value="closed">Encerradas</option>' +
      '</select>' +
      '<select id="sortFilter" class="filter-select" aria-label="Ordenar">' +
        '<option value="deadline">Fecha primeiro</option>' +
        '<option value="newest">Mais recentes</option>' +
        '<option value="title">T\u00edtulo (A-Z)</option>' +
      '</select>' +
      '<label class="filter-check"><input type="checkbox" id="freeFilter"> Somente gratuitas</label>' +
      '<button type="button" id="clearFilters" class="filter-clear">Limpar</button>' +
    '</div>';

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
    state.search = ''; state.status = 'open'; state.sort = 'deadline'; state.isFree = false; state.day = 'all'; state.page = 1;
    const campoBusca = document.getElementById('searchInput');
    if (campoBusca) campoBusca.value = '';
    const limpar = document.getElementById('clearSearch');
    if (limpar) limpar.hidden = true;
    document.getElementById('statusFilter').value = 'open';
    document.getElementById('sortFilter').value = 'deadline';
    document.getElementById('freeFilter').checked = false;
    renderDayBar(); renderList(); atualizaContadorBusca();
  });
}

function renderList() {
  const grid = document.getElementById('listGrid');
  if (!grid) return;

  const items = filtered({});
  grid.innerHTML = items.length
    ? items.map(cardHTML).join('')
    : '<p class="empty">Nenhuma oportunidade encontrada com os filtros atuais. Tente limpar a busca.</p>';

  const info = document.getElementById('resultsInfo');
  if (info) info.textContent = items.length + ' oportunidade(s) encontrada(s)';
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
  if (item.deadline) {
    let dias = '';
    if (item.daysLeft !== null && item.daysLeft !== undefined) {
      const cls = item.daysLeft <= 3 ? 'urg' : (item.daysLeft <= 7 ? 'warn' : '');
      const txt = item.daysLeft <= 0 ? '\u00faltimo dia'
        : (item.daysLeft === 1 ? 'falta 1 dia' : 'faltam ' + item.daysLeft + ' dias');
      dias = ' <span class="dias ' + cls + '">' + txt + '</span>';
    }
    meta.push('<li><span class="meta-k">Prazo</span><span class="meta-v">' + escapeHtml(item.deadline) + dias + '</span></li>');
  }
  if (item.location) meta.push('<li><span class="meta-k">Local</span><span class="meta-v">' + escapeHtml(item.location) + '</span></li>');
  if (item.source_name) meta.push('<li><span class="meta-k">Fonte</span><span class="meta-v">' + escapeHtml(item.source_name) + '</span></li>');

  const kicker = CONFIG.KICKERS[item.category] || '';
  return '<article class="card cat-' + escapeHtml(item.category) + '">' +
      '<div class="card-top">' +
        '<span class="card-cat">' + cat.emoji + ' ' + cat.label + '</span>' +
        '<span class="card-badges">' + badges.join('') + '</span>' +
      '</div>' +
      '<h3 class="card-title"><a href="' + link + '" target="_blank" rel="noopener noreferrer">' + marca(item.title) + '</a></h3>' +
      '<p class="card-desc">' + marca(item.short_description) + '</p>' +
      cardEixos(item) +
      '<ul class="card-meta">' + meta.join('') + '</ul>' +
      (kicker ? '<p class="card-kick">' + escapeHtml(kicker) + '</p>' : '') +
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
    if (state.search && !matchesSearch(i)) return false;
    if (state.status === 'open') { if (!isOpen(i)) return false; }
    else if (state.status !== 'all' && i.status !== state.status) return false;
    if (state.isFree && i.is_free !== true) return false;
    return true;
  });
  return sortItems(out);
}

/* Eixos pesquisaveis por categoria (novos campos da base) */
const EIXOS = {
  trabalho: ['tipo', 'cargos', 'esc', 'area', 'req'],
  educacao: ['nivel', 'areaEstudo', 'mod', 'custo'],
  esportes: ['modEsporte', 'formato', 'faixa'],
  cultura: ['ling', 'tipoEdital']
};

function semAcento(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normaliza(s) { return semAcento(s).toLowerCase(); }

/* Palavras vazias: ignoradas na busca (na consulta e no indice) */
const STOPWORDS = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas',
  'a', 'o', 'as', 'os', 'um', 'uma', 'para', 'por', 'com', 'ao', 'aos', 'se', 'que', 'ate', 'the', 'of'];

function termosBusca() {
  return normaliza(state.search).split(/\s+/).filter(function (t) {
    return t.length > 0 && STOPWORDS.indexOf(t) < 0;
  });
}

function blobItem(i) {
  const partes = [i.title, i.short_description, i.source_name, i.location, i.deadline,
    i.category, (i.tags || []).join(' '), (i.kw || []).join(' ')];
  (EIXOS[i.category] || []).forEach(function (k) {
    const v = i[k];
    if (v) partes.push([].concat(v).join(' '));
  });
  return normaliza(partes.join(' ')).split(/\s+/).filter(function (w) {
    return w.length > 0 && STOPWORDS.indexOf(w) < 0;
  }).join(' ');
}

/* casa por INICIO de palavra: "curso" acha "curso/cursos", nao "concurso" */
function casaTermo(blob, t) {
  const seguro = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(^|[^0-9a-z])' + seguro).test(blob);
}

function matchesSearch(i) {
  const ts = termosBusca();
  if (!ts.length) return true;
  const b = blobItem(i);
  return ts.every(function (t) { return casaTermo(b, t); });
}

/* Realce dos termos digitados (marca amarela) */
const ACCENTES = { a: '[a\u00e1\u00e0\u00e2\u00e3\u00e4]', e: '[e\u00e9\u00e8\u00ea\u00eb]', i: '[i\u00ed\u00ec\u00ee\u00ef]',
  o: '[o\u00f3\u00f2\u00f4\u00f5\u00f6]', u: '[u\u00fa\u00f9\u00fb\u00fc]', c: '[c\u00e7]', n: '[n\u00f1]' };

function padraoBusca(t) {
  return t.split('').map(function (ch) {
    return ACCENTES[ch] || ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('');
}

function marca(texto) {
  let out = escapeHtml(texto);
  termosBusca().slice().sort(function (a, b) { return b.length - a.length; })
    .forEach(function (t) {
      out = out.replace(new RegExp('(' + padraoBusca(t) + ')', 'gi'), '<mark>$1</mark>');
    });
  return out;
}

/* Rotulos dos eixos por categoria */
const EIXO_LABEL = {
  tipo: 'Tipo', cargos: 'Cargos', esc: 'Escolaridade', area: '\u00c1rea', req: 'Requisitos',
  nivel: 'N\u00edvel', areaEstudo: '\u00c1rea', mod: 'Modalidade', custo: 'Custo',
  modEsporte: 'Modalidade', formato: 'Formato', faixa: 'Faixa',
  ling: 'Linguagem', tipoEdital: 'Tipo'
};

function cardEixos(item) {
  const linhas = [];
  (EIXOS[item.category] || []).forEach(function (k) {
    const v = item[k];
    if (!v) return;
    const vals = [].concat(v).filter(Boolean);
    if (!vals.length) return;
    linhas.push('<li><span class="meta-k">' + EIXO_LABEL[k] + '</span>' +
      '<span class="meta-v">' + escapeHtml(vals.join(' \u00b7 ')) + '</span></li>');
  });
  return linhas.length ? '<ul class="card-meta card-eixos">' + linhas.join('') + '</ul>' : '';
}

function sortItems(arr) {
  const copy = arr.slice();
  if (state.sort === 'title') {
    copy.sort(function (a, b) { return (a.title || '').localeCompare(b.title || '', 'pt-BR'); });
  } else if (state.sort === 'deadline') {
    /* prazo mais proximo primeiro; sem data (continuas) no fim; empate pela mais recente */
    copy.sort(function (a, b) {
      const da = a.deadline_date || '9999-99-99';
      const db = b.deadline_date || '9999-99-99';
      if (da !== db) return da.localeCompare(db);
      return (b.published_date || '').localeCompare(a.published_date || '');
    });
  } else {
    copy.sort(function (a, b) { return (b.published_date || '').localeCompare(a.published_date || ''); });
  }
  return copy;
}

function isOpen(i) {
  if (!(i.status === 'open' || i.status === 'continuous' || i.status === 'extended')) return false;
  /* vencido nao aparece: sem data (continuo) ou com prazo de hoje em diante */
  return !i.deadline_date || i.deadline_date >= todayISO();
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



