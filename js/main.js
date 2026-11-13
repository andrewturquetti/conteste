/**
 * CONTESTE.INFO - JavaScript principal
 * Portal diario de inscricoes abertas (Cultura, Educacao, Esportes, Trabalho).
 * Sem imagens, sem dependencias externas. A lista mostra apenas oportunidades
 * com inscricoes abertas e a busca filtra por prefixo em todos os campos.
 */
'use strict';

const CONFIG = {
  DATA_URL: 'data/oportunidades.json',
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
  category: null,
  search: '',
  isFree: false,
  sort: 'deadline'
};

document.addEventListener('DOMContentLoaded', init);

function init() {
  state.category = categoriaDoHash();

  initMobileMenu();
  initScrollEffects();
  initScrollAnimations();
  renderSearchBar();
  initCopiarPix();
  window.addEventListener('hashchange', function () {
    state.category = categoriaDoHash();
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
        '<select class="sel" id="catSelect" aria-label="Filtrar por categoria">' +
          '<option value="todos">Todas as categorias</option>' + cats +
        '</select>' +
      '</div>' +
      '<div class="srow" id="resRow" style="margin-top:0.5rem" hidden><span class="sres" id="searchRes"></span></div>' +
      '<div class="quick" id="quick">' +
        CONFIG.SUGESTOES.map(function (s) {
          return '<button type="button" data-q="' + s + '">' + s + '</button>';
        }).join('') +
      '</div>' +
    '</div>';

  const input = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearch');

  function aplicaBusca(valor) {
    const anterior = state.search;
    state.search = valor;
    clearBtn.hidden = !valor;
    /* a lista e redesenhada a cada tecla: o que aparece na tela e exatamente o que o contador diz */
    renderList();
    atualizaContadorBusca();
    if (!anterior && valor) revelaResultados();
  }

  input.addEventListener('input', debounce(function () { aplicaBusca(input.value.trim()); }, 60));
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); aplicaBusca(input.value.trim()); }
    else if (e.key === 'Escape') { input.value = ''; aplicaBusca(''); }
  });
  clearBtn.addEventListener('click', function () { input.value = ''; aplicaBusca(''); input.focus(); });

  const sel = document.getElementById('catSelect');
  if (sel) {
    sel.value = state.category || 'todos';
    sel.addEventListener('change', function () {
      state.category = this.value === 'todos' ? null : this.value;
      if (history.replaceState) {
        history.replaceState(null, '', state.category ? '#' + state.category : location.pathname + location.search);
      }
      renderList();
      atualizaContadorBusca();
    });
  }

  el.querySelectorAll('#quick button').forEach(function (b) {
    b.addEventListener('click', function () {
      input.value = b.dataset.q;
      aplicaBusca(b.dataset.q);
      revelaResultados();
    });
  });
}

/* Leva a lista de resultados para a area visivel (uma vez por busca) */
function revelaResultados() {
  const secao = document.getElementById('oportunidades');
  if (!secao) return;
  const r = secao.getBoundingClientRect();
  /* ja esta na tela: nao mexe no scroll */
  if (r.top > 0 && r.top < window.innerHeight * 0.55) return;
  const barra = document.getElementById('searchbar');
  const alturaBarra = barra ? barra.offsetHeight : 0;
  const topoFixo = window.innerWidth > 768 ? 68 : 8;
  const y = window.pageYOffset + r.top - alturaBarra - topoFixo;
  window.scrollTo({ top: Math.max(y, 0), behavior: 'smooth' });
}

/* Volta a lista completa: usado pelo botao Limpar e pelo vazio da busca */
function limpaBusca() {
  state.search = '';
  const campo = document.getElementById('searchInput');
  if (campo) campo.value = '';
  const limpar = document.getElementById('clearSearch');
  if (limpar) limpar.hidden = true;
  renderList();
  atualizaContadorBusca();
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
/* Assinatura mensal: botao que copia a chave PIX                      */
/* ------------------------------------------------------------------ */
function initCopiarPix() {
  document.addEventListener('click', function (e) {
    const btn = e.target && e.target.closest ? e.target.closest('[data-pix]') : null;
    if (!btn) return;
    const chave = btn.getAttribute('data-pix');
    if (!chave) return;
    if (!btn.getAttribute('data-rotulo')) btn.setAttribute('data-rotulo', btn.textContent);
    const rotulo = btn.getAttribute('data-rotulo');
    const feito = function () {
      btn.textContent = 'Chave copiada!';
      setTimeout(function () { btn.textContent = rotulo; }, 2500);
    };
    const reserva = function () {
      const ta = document.createElement('textarea');
      ta.value = chave;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      document.body.removeChild(ta);
      if (ok) feito();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(chave).then(feito, reserva);
    } else {
      reserva();
    }
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
    const target = document.getElementById('listGrid');
    if (target) target.innerHTML = '<p class="empty">N\u00e3o foi poss\u00edvel carregar as oportunidades. Recarregue a p\u00e1gina.</p>';
  }
}

function normalize(item) {
  const pub = (item.published_date || item.created_at || '').slice(0, 10);
  const dl = item.deadline_date || null;
  const obj = Object.assign({}, item, {
    published_date: pub,
    daysLeft: dl ? daysBetween(todayISO(), dl) : null
  });
  /* indice de busca montado uma unica vez por item, nao a cada tecla */
  obj._blob = blobItem(obj);
  return obj;
}

function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

/* ------------------------------------------------------------------ */
/* Renderizacao                                                        */
/* ------------------------------------------------------------------ */
function renderPage() {
  renderHeaderLive();
  renderFilters();
  renderList();
}

function renderFilters() {
  const el = document.getElementById('filters');
  if (!el || el.dataset.ready) return;
  el.dataset.ready = '1';
  el.innerHTML =
    '<div class="filters-row">' +
      '<span class="filters-note" id="filtersCount"></span>' +
      '<select id="sortFilter" class="filter-select" aria-label="Ordenar">' +
        '<option value="deadline">Fecha primeiro</option>' +
        '<option value="newest">Mais recentes</option>' +
        '<option value="title">T\u00edtulo (A-Z)</option>' +
      '</select>' +
      '<label class="filter-check"><input type="checkbox" id="freeFilter"> Somente gratuitas</label>' +
      '<button type="button" id="clearFilters" class="filter-clear">Limpar</button>' +
    '</div>';

  document.getElementById('sortFilter').addEventListener('change', function () {
    state.sort = this.value; renderList();
  });
  document.getElementById('freeFilter').addEventListener('change', function () {
    state.isFree = this.checked; renderList();
  });
  document.getElementById('clearFilters').addEventListener('click', function () {
    state.sort = 'deadline';
    state.isFree = false;
    document.getElementById('sortFilter').value = 'deadline';
    document.getElementById('freeFilter').checked = false;
    limpaBusca();
  });
}

function renderList() {
  const grid = document.getElementById('listGrid');
  if (!grid) return;

  const ts = termosBusca();
  const items = filtered({});
  const cat = CONFIG.CATEGORIES.filter(function (c) { return c.key === state.category; })[0];

  if (items.length) {
    grid.innerHTML = items.map(cardHTML).join('');
  } else if (ts.length) {
    grid.innerHTML = '<div class="empty-block">' +
        '<p class="empty">Nenhuma oportunidade aberta encontrada para \u201c' + escapeHtml(state.search) + '\u201d.</p>' +
        '<button type="button" class="filter-clear" id="limparBuscaVazia">Limpar busca</button>' +
      '</div>';
    const btn = document.getElementById('limparBuscaVazia');
    if (btn) {
      btn.addEventListener('click', function () {
        limpaBusca();
        const campo = document.getElementById('searchInput');
        if (campo) campo.focus();
      });
    }
  } else {
    grid.innerHTML = '<p class="empty">Nenhuma oportunidade aberta no momento' +
      (cat ? ' em ' + cat.label : '') + '. Novas inscri\u00e7\u00f5es entram todos os dias.</p>';
  }

  const contador = document.getElementById('filtersCount');
  if (contador) {
    contador.textContent = items.length + (items.length === 1 ? ' oportunidade aberta' : ' oportunidades abertas') +
      (cat ? ' em ' + cat.label : '');
  }
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
    const quando = item.daysLeft === 0 ? 'hoje'
      : (item.daysLeft === 1 ? 'em 1 dia' : 'em ' + item.daysLeft + ' dias');
    badges.push('<span class="badge badge-soon">Encerra ' + quando + '</span>');
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

/* O site lista apenas oportunidades com inscricoes abertas (nada de encerradas) */
function filtered(opts) {
  opts = opts || {};
  const cat = opts.category || state.category;
  const ts = termosBusca();
  const out = state.all.filter(function (i) {
    if (!isOpen(i)) return false;
    if (cat && i.category !== cat) return false;
    if (ts.length && !matchesSearch(i, ts)) return false;
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

/* Termos da busca em cache: recalcula so quando o texto muda */
let termosCache = { chave: null, lista: [] };

function termosBusca() {
  if (termosCache.chave === state.search) return termosCache.lista;
  const lista = normaliza(state.search).split(/\s+/).filter(function (t) {
    return t.length > 0 && STOPWORDS.indexOf(t) < 0;
  });
  termosCache = { chave: state.search, lista: lista };
  return lista;
}

/* 27 unidades da federacao: "SP" acha "Sao Paulo" e o nome acha a sigla */
const UF_NOME = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amap\u00e1', AM: 'Amazonas', BA: 'Bahia', CE: 'Cear\u00e1',
  DF: 'Distrito Federal', ES: 'Esp\u00edrito Santo', GO: 'Goi\u00e1s', MA: 'Maranh\u00e3o',
  MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Par\u00e1',
  PB: 'Para\u00edba', PR: 'Paran\u00e1', PE: 'Pernambuco', PI: 'Piau\u00ed', RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rond\u00f4nia', RR: 'Roraima',
  SC: 'Santa Catarina', SP: 'S\u00e3o Paulo', SE: 'Sergipe', TO: 'Tocantins'
};

const MESES = ['janeiro', 'fevereiro', 'mar\u00e7o', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function ufTexto(uf) {
  const s = String(uf || '').trim().toUpperCase();
  return UF_NOME[s] ? s + ' ' + UF_NOME[s] : s;
}

/* Todas as formas de data que o visitante costuma digitar */
function datasTexto(i) {
  const out = [];
  [i.published_date, i.deadline_date].forEach(function (iso) {
    const s = String(iso || '').slice(0, 10);
    const p = s.split('-');
    if (p.length !== 3 || !p[0] || !p[1] || !p[2]) return;
    const mes = MESES[Number(p[1]) - 1] || '';
    out.push(s);                              /* 2026-11-03 */
    out.push(p[2] + '/' + p[1] + '/' + p[0]); /* 03/11/2026 */
    out.push(p[2] + '/' + p[1]);              /* 03/11 */
    out.push(mes);                            /* novembro */
    out.push(p[2] + ' ' + mes);               /* 03 novembro */
  });
  return out.join(' ');
}

/* Dominio do link oficial: "pciconcursos" acha a oportunidade */
function dominio(url) {
  const m = String(url || '').match(/^https?:\/\/([^/?#]+)/i);
  return m ? m[1].replace(/^www\./i, '') : '';
}

function blobItem(i) {
  const partes = [i.title, i.short_description, i.source_name, i.location, i.deadline,
    i.category, i.country, (i.tags || []).join(' '), (i.kw || []).join(' '),
    ufTexto(i.state), datasTexto(i), dominio(i.official_link),
    i.is_free === true ? 'gratuito gratuita gratis' : ''];
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

function matchesSearch(i, ts) {
  const termos = ts || termosBusca();
  if (!termos.length) return true;
  const b = i._blob || blobItem(i);
  return termos.every(function (t) { return casaTermo(b, t); });
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



