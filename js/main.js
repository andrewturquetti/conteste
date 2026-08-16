/**
 * CONTESTE.INFO - JavaScript Principal
 * Versão 2.0 - Com busca, filtros e sem limites artificiais
 */

// Configuração global
const CONFIG = {
    ITEMS_PER_PAGE: 12,
    DEFAULT_CATEGORY: null,
    DEFAULT_STATUS: 'open',
    DEFAULT_SORT: 'newest',
    BUTTONDOWN_USERNAME: 'SEU_USUARIO_BUTTONDOWN'
};

// Estado da aplicação
const state = {
    allOpportunities: [],
    filteredOpportunities: [],
    currentPage: 1,
    currentCategory: null,
    searchQuery: '',
    filters: {
        status: 'open',
        isFree: null,
        modality: null,
        country: null,
        state: null
    },
    sortBy: 'newest'
};

document.addEventListener('DOMContentLoaded', function() {
    initMobileMenu();
    initScrollEffects();
    initNewsletterForm();
    initScrollAnimations();
    initOpportunities();
    initSearchAndFilters();
    initLanguageSwitcher();
});

function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const nav = document.getElementById('nav');
    if (!mobileMenuBtn || !nav) return;

    mobileMenuBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        nav.classList.toggle('active');
        document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
    });

    const navLinks = nav.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            mobileMenuBtn.classList.remove('active');
            nav.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    document.addEventListener('click', function(e) {
        if (!nav.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            mobileMenuBtn.classList.remove('active');
            nav.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

function initScrollEffects() {
    const header = document.getElementById('header');
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const headerHeight = header.offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                window.scrollTo({ top: targetPosition, behavior: 'smooth' });
            }
        });
    });
}

/**
 * Integração com Buttondown (https://buttondown.com).
 * 1. Crie uma conta gratuita em https://buttondown.com
 * 2. Troque BUTTONDOWN_USERNAME abaixo pelo seu usuário Buttondown.
 * Até lá, o formulário funciona em modo simulado (não envia e-mails de verdade).
 */
function initNewsletterForm() {
    const form = document.getElementById('newsletterForm');
    if (!form) return;

    const isConfigured = CONFIG.BUTTONDOWN_USERNAME !== 'SEU_USUARIO_BUTTONDOWN';
    if (isConfigured) {
        form.action = 'https://buttondown.com/api/emails/embed-subscribe/' + CONFIG.BUTTONDOWN_USERNAME;
    } else {
        console.info('[CONTESTE.INFO] Newsletter em modo simulado. Configure BUTTONDOWN_USERNAME em js/main.js para ativar o envio real.');
    }

    form.addEventListener('submit', function(e) {
        const emailInput = this.querySelector('input[type="email"]');
        const email = emailInput.value.trim();
        const button = this.querySelector('button');

        if (!isValidEmail(email)) {
            e.preventDefault();
            showNotification('Por favor, digite um e-mail válido.', 'error');
            emailInput.focus();
            return;
        }

        if (!isConfigured) {
            e.preventDefault();
            button.disabled = true;
            button.textContent = 'Enviando...';

            setTimeout(function() {
                showNotification('Inscrição realizada com sucesso!', 'success');
                form.reset();
                button.disabled = false;
                button.textContent = 'Inscrever-se';
            }, 1500);
            return;
        }

        showNotification('Quase lá! Confira seu e-mail para confirmar a inscrição.', 'success');
    });
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const icon = type === 'error' ? '✕' : '✓';
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `<span class="notification-icon">${icon}</span><span>${escapeHtml(message)}</span><button aria-label="Fechar">&times;</button>`;
    notification.classList.add(type === 'error' ? 'notification--error' : 'notification--success');

    notification.querySelector('button').addEventListener('click', () => notification.remove());
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 5000);
}

function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.news-card, .category-section');
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        animatedElements.forEach(el => {
            el.classList.add('scroll-animate');
            observer.observe(el);
        });
    } else {
        animatedElements.forEach(el => el.classList.add('visible'));
    }
}

/**
 * CONTESTE.INFO é um portal de OPORTUNIDADES: editais, bolsas, cursos gratuitos,
 * concursos e vagas com inscrições abertas em Cultura, Educação, Esportes e Trabalho.
 * 
 * VERSÃO 2.0: Sem limites artificiais, com busca e filtros
 * 
 * O conteúdo vem de data/oportunidades.json, uma base curada manualmente (pesquisada
 * e verificada uma a uma — link oficial e imagem confirmados). Para atualizar,
 * regenere esse arquivo com uma nova pesquisa e rode scripts/gerar-conteudo-diario.py
 * para produzir o relatório de newsletter e o pacote de imagens para redes sociais.
 */
function initOpportunities() {
    const sections = document.querySelectorAll('.category-section[id]');
    const isHomepage = sections.length > 1;
    
    // Detectar categoria da página atual
    const currentPage = window.location.pathname.split('/').pop();
    let currentCategory = null;
    
    if (currentPage === 'cultura.html') currentCategory = 'cultura';
    else if (currentPage === 'educacao.html') currentCategory = 'educacao';
    else if (currentPage === 'esportes.html') currentCategory = 'esportes';
    else if (currentPage === 'trabalho.html') currentCategory = 'trabalho';
    
    state.currentCategory = currentCategory;

    fetch('data/oportunidades.json')
        .then(function(res) {
            if (!res.ok) throw new Error('Falha ao carregar oportunidades: ' + res.status);
            return res.json();
        })
        .then(function(data) {
            state.allOpportunities = Array.isArray(data.opportunities) ? data.opportunities : [];
            
            // Aplicar filtros iniciais
            applyFilters();
            
            // Renderizar oportunidades
            if (isHomepage) {
                renderAllCategories();
            } else {
                renderCategoryPage(currentCategory);
            }
            
            // Inicializar controles de paginação se necessário
            initPagination();
        })
        .catch(function(err) {
            console.warn('[CONTESTE.INFO] Não foi possível carregar oportunidades, mantendo conteúdo padrão.', err);
        });
}

function renderAllCategories() {
    const categories = ['cultura', 'educacao', 'esportes', 'trabalho'];
    
    categories.forEach(function(category) {
        const section = document.getElementById(category);
        if (!section) return;
        
        const grid = section.querySelector('.news-grid');
        if (!grid) return;
        
        // Filtrar oportunidades desta categoria
        const items = state.filteredOpportunities.filter(function(item) { 
            return item.category === category; 
        });
        
        if (!items.length) {
            grid.innerHTML = '<p class="no-results">Nenhuma oportunidade disponível no momento.</p>';
            return;
        }
        
        // Na home, mostrar apenas 3 por categoria
        const displayItems = items.slice(0, 3);
        grid.innerHTML = displayItems.map(renderOpportunityCard).join('');
        
        // Adicionar animação
        grid.querySelectorAll('.news-card').forEach(function(card) {
            card.classList.add('scroll-animate', 'visible');
        });
    });
}

function renderCategoryPage(category) {
    const section = document.getElementById(category);
    if (!section) return;
    
    const grid = section.querySelector('.news-grid');
    if (!grid) return;
    
    // Filtrar oportunidades desta categoria
    const items = state.filteredOpportunities.filter(function(item) { 
        return item.category === category; 
    });
    
    if (!items.length) {
        grid.innerHTML = '<p class="no-results">Nenhuma oportunidade disponível no momento.</p>';
        return;
    }
    
    // Paginação
    const startIndex = (state.currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
    const endIndex = startIndex + CONFIG.ITEMS_PER_PAGE;
    const pageItems = items.slice(startIndex, endIndex);
    
    grid.innerHTML = pageItems.map(renderOpportunityCard).join('');
    
    // Adicionar animação
    grid.querySelectorAll('.news-card').forEach(function(card) {
        card.classList.add('scroll-animate', 'visible');
    });
    
    // Atualizar contador
    updateResultsCount(items.length);
}

function renderOpportunityCard(item) {
    const isOngoing = !item.deadline_date || item.deadline === 'Vagas contínuas';
    const deadlineLabel = isOngoing ? 'Vagas contínuas' : 'Até ' + item.deadline;
    const statusClass = getStatusClass(item.status);
    
    return '<article class="news-card opportunity-card ' + statusClass + '">' +
        '<div class="news-image">' +
            '<img src="' + escapeHtml(item.image_url) + '" alt="" loading="lazy" ' +
                'onerror="this.style.display=\'none\'">' +
            '<span class="news-tag' + (isOngoing ? ' news-tag--ongoing' : '') + '">' + escapeHtml(deadlineLabel) + '</span>' +
        '</div>' +
        '<div class="news-content">' +
        '<span class="news-date">' + escapeHtml(item.source_name) + ' · ' + escapeHtml(item.location) + '</span>' +
        '<h3 class="news-title"><a href="' + escapeHtml(item.official_link) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(item.title) + '</a></h3>' +
        '<p class="news-excerpt">' + escapeHtml(item.short_description) + '</p>' +
        '<a class="opportunity-cta" href="' + escapeHtml(item.official_link) + '" target="_blank" rel="noopener noreferrer">Inscreva-se →</a>' +
        '</div></article>';
}

function getStatusClass(status) {
    switch(status) {
        case 'closed': return 'opportunity-card--closed';
        case 'extended': return 'opportunity-card--extended';
        case 'coming_soon': return 'opportunity-card--coming-soon';
        default: return '';
    }
}

function updateResultsCount(total) {
    const existing = document.querySelector('.results-count');
    if (existing) existing.remove();
    
    const countDiv = document.createElement('div');
    countDiv.className = 'results-count';
    countDiv.textContent = total + ' oportunidade' + (total !== 1 ? 's' : '') + ' encontrada' + (total !== 1 ? 's' : '');
    
    const section = document.querySelector('.category-section');
    if (section) {
        const header = section.querySelector('.category-header');
        if (header) {
            header.appendChild(countDiv);
        }
    }
}

function initPagination() {
    // Remover paginação existente
    const existingPagination = document.querySelector('.pagination');
    if (existingPagination) existingPagination.remove();
    
    // Só criar paginação em páginas de categoria
    const isCategoryPage = state.currentCategory !== null;
    if (!isCategoryPage) return;
    
    const items = state.filteredOpportunities.filter(item => item.category === state.currentCategory);
    const totalPages = Math.ceil(items.length / CONFIG.ITEMS_PER_PAGE);
    
    if (totalPages <= 1) return;
    
    const pagination = document.createElement('nav');
    pagination.className = 'pagination';
    pagination.setAttribute('aria-label', 'Paginação de oportunidades');
    
    let paginationHTML = '<ul class="pagination-list">';
    
    // Botão anterior
    if (state.currentPage > 1) {
        paginationHTML += '<li><button class="pagination-btn" data-page="' + (state.currentPage - 1) + '" aria-label="Página anterior">←</button></li>';
    }
    
    // Números das páginas
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= state.currentPage - 1 && i <= state.currentPage + 1)) {
            paginationHTML += '<li><button class="pagination-btn' + (i === state.currentPage ? ' active' : '') + '" data-page="' + i + '">' + i + '</button></li>';
        } else if (i === state.currentPage - 2 || i === state.currentPage + 2) {
            paginationHTML += '<li><span class="pagination-ellipsis">...</span></li>';
        }
    }
    
    // Botão próximo
    if (state.currentPage < totalPages) {
        paginationHTML += '<li><button class="pagination-btn" data-page="' + (state.currentPage + 1) + '" aria-label="Próxima página">→</button></li>';
    }
    
    paginationHTML += '</ul>';
    pagination.innerHTML = paginationHTML;
    
    // Adicionar eventos
    pagination.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            state.currentPage = parseInt(this.dataset.page);
            renderCategoryPage(state.currentCategory);
            initPagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
    
    // Inserir após a grid
    const section = document.querySelector('.category-section');
    if (section) {
        section.appendChild(pagination);
    }
}

// Sistema de busca e filtros
function initSearchAndFilters() {
    // Criar elementos de busca e filtro se não existirem
    createSearchAndFilterUI();
    
    // Event listeners
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function(e) {
            state.searchQuery = e.target.value.toLowerCase().trim();
            state.currentPage = 1;
            applyFilters();
            
            if (state.currentCategory) {
                renderCategoryPage(state.currentCategory);
            } else {
                renderAllCategories();
            }
            initPagination();
        }, 300));
    }
    
    // Filtro por status
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function(e) {
            state.filters.status = e.target.value || 'open';
            state.currentPage = 1;
            applyFilters();
            
            if (state.currentCategory) {
                renderCategoryPage(state.currentCategory);
            } else {
                renderAllCategories();
            }
            initPagination();
        });
    }
    
    // Filtro por gratuito
    const freeFilter = document.getElementById('freeFilter');
    if (freeFilter) {
        freeFilter.addEventListener('change', function(e) {
            state.filters.isFree = e.target.checked ? true : null;
            state.currentPage = 1;
            applyFilters();
            
            if (state.currentCategory) {
                renderCategoryPage(state.currentCategory);
            } else {
                renderAllCategories();
            }
            initPagination();
        });
    }
    
    // Ordenação
    const sortFilter = document.getElementById('sortFilter');
    if (sortFilter) {
        sortFilter.addEventListener('change', function(e) {
            state.sortBy = e.target.value;
            state.currentPage = 1;
            applyFilters();
            
            if (state.currentCategory) {
                renderCategoryPage(state.currentCategory);
            } else {
                renderAllCategories();
            }
            initPagination();
        });
    }
}

function createSearchAndFilterUI() {
    // Verificar se já existe
    if (document.getElementById('searchAndFilters')) return;
    
    const filtersHTML = `
        <div id="searchAndFilters" class="search-filters">
            <div class="container">
                <div class="search-box">
                    <input type="text" id="searchInput" class="search-input" placeholder="Buscar oportunidades..." aria-label="Buscar oportunidades">
                    <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </div>

                <div class="filters-group">
                    <div class="filter-item">
                        <label for="statusFilter" class="filter-label">Status:</label>
                        <select id="statusFilter" class="filter-select">
                            <option value="open">Inscrições abertas</option>
                            <option value="continuous">Vagas contínuas</option>
                            <option value="coming_soon">Em breve</option>
                            <option value="all">Todos</option>
                        </select>
                    </div>

                    <div class="filter-item">
                        <label class="filter-label checkbox-label">
                            <input type="checkbox" id="freeFilter">
                            Apenas gratuitas
                        </label>
                    </div>

                    <div class="filter-item">
                        <label for="sortFilter" class="filter-label">Ordenar por:</label>
                        <select id="sortFilter" class="filter-select">
                            <option value="newest">Mais recentes</option>
                            <option value="deadline">Prazo terminando</option>
                            <option value="updated">Atualizadas recentemente</option>
                        </select>
                    </div>

                    <button id="clearFilters" class="btn-clear-filters">Limpar filtros</button>
                </div>
            </div>
        </div>
    `;
    
    // Inserir após o hero ou no início do main
    const main = document.querySelector('main');
    if (main) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = filtersHTML;
        const filtersElement = tempDiv.firstElementChild;
        
        // Inserir após a primeira section (hero) ou no início
        const hero = main.querySelector('.hero, .page-hero');
        if (hero) {
            hero.after(filtersElement);
        } else {
            main.insertBefore(filtersElement, main.firstChild);
        }
        
        // Event listener para limpar filtros
        document.getElementById('clearFilters').addEventListener('click', function() {
            document.getElementById('searchInput').value = '';
            document.getElementById('statusFilter').value = 'open';
            document.getElementById('freeFilter').checked = false;
            document.getElementById('sortFilter').value = 'newest';
            
            state.searchQuery = '';
            state.filters = {
                status: 'open',
                isFree: null,
                modality: null,
                country: null,
                state: null
            };
            state.sortBy = 'newest';
            state.currentPage = 1;
            
            applyFilters();
            
            if (state.currentCategory) {
                renderCategoryPage(state.currentCategory);
            } else {
                renderAllCategories();
            }
            initPagination();
        });
    }
}

function applyFilters() {
    state.filteredOpportunities = state.allOpportunities.filter(function(item) {
        // Filtro de busca por texto
        if (state.searchQuery) {
            const searchFields = [
                item.title,
                item.short_description,
                item.source_name,
                item.location,
                item.category,
                (item.tags || []).join(' ')
            ].map(function(field) { return field ? field.toLowerCase() : ''; });
            
            const matchesSearch = searchFields.some(function(field) {
                return field.includes(state.searchQuery);
            });
            
            if (!matchesSearch) return false;
        }
        
        // Filtro por status
        if (state.filters.status && state.filters.status !== 'all') {
            if (state.filters.status === 'continuous' && item.deadline !== 'Vagas contínuas') return false;
            if (state.filters.status === 'open' && item.status === 'closed') return false;
            if (state.filters.status === 'coming_soon' && item.status !== 'coming_soon') return false;
        }
        
        // Filtro por gratuito
        if (state.filters.isFree === true && !item.is_free) return false;
        
        return true;
    });
    
    // Ordenar resultados
    sortOpportunities();
}

function sortOpportunities() {
    state.filteredOpportunities.sort(function(a, b) {
        switch(state.sortBy) {
            case 'deadline':
                // Oportunidades com prazo mais próximo primeiro
                if (!a.deadline_date && !b.deadline_date) return 0;
                if (!a.deadline_date) return 1;
                if (!b.deadline_date) return -1;
                return new Date(a.deadline_date) - new Date(b.deadline_date);
                
            case 'updated':
                return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
                
            case 'newest':
            default:
                return new Date(b.created_at) - new Date(a.created_at);
        }
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Language Switcher
const TRANSLATIONS = {
    pt: {
        site_title: "CONTESTE.INFO - Oportunidades em Cultura, Educação, Esportes e Trabalho",
        site_description: "Editais, bolsas, cursos gratuitos, concursos e vagas com inscrições abertas em Cultura, Educação, Esportes e Trabalho.",
        hero_title: "Oportunidades que <span class='highlight'>transformam</span> seu futuro",
        hero_subtitle: "Editais, bolsas, cursos gratuitos, concursos e vagas com inscrições abertas em Cultura, Educação, Esportes e Trabalho — tudo em um só lugar.",
        hero_cta: "Ver Oportunidades",
        categories: {
            cultura: "Cultura",
            educacao: "Educação",
            esportes: "Esportes",
            trabalho: "Trabalho"
        },
        nav: {
            inicio: "Início",
            veja_mais: "VEJA MAIS →"
        },
        newsletter: {
            title: "Receba oportunidades no seu e-mail",
            text: "Cadastre-se para receber editais, bolsas, cursos gratuitos, concursos e vagas de Cultura, Educação, Esportes e Trabalho.",
            placeholder: "Digite seu e-mail",
            button: "Inscrever-se"
        },
        footer: {
            description: "Seu portal de oportunidades: editais, bolsas, cursos gratuitos, concursos e vagas em Cultura, Educação, Esportes e Trabalho.",
            categories: "Categorias",
            institucional: "Institucional",
            contato: "Contato",
            sobre: "Sobre nós",
            privacidade: "Política de privacidade",
            termos: "Termos de uso",
            copyright: "Todos os direitos reservados."
        },
        common: {
            inscricao: "Inscreva-se →",
            vagas_continuas: "Vagas contínuas",
            ate: "Até",
            search_placeholder: "Buscar oportunidades...",
            status_filter: "Status:",
            free_filter: "Apenas gratuitas",
            sort_filter: "Ordenar por:",
            sort_newest: "Mais recentes",
            sort_deadline: "Prazo terminando",
            sort_updated: "Atualizadas recentemente",
            clear_filters: "Limpar filtros",
            no_results: "Nenhuma oportunidade disponível no momento."
        }
    },
    en: {
        site_title: "CONTESTE.INFO - Opportunities in Culture, Education, Sports and Work",
        site_description: "Grants, scholarships, free courses, competitions and job openings in Culture, Education, Sports and Work.",
        hero_title: "Opportunities that <span class='highlight'>transform</span> your future",
        hero_subtitle: "Grants, scholarships, free courses, competitions and job openings in Culture, Education, Sports and Work — all in one place.",
        hero_cta: "View Opportunities",
        categories: {
            cultura: "Culture",
            educacao: "Education",
            esportes: "Sports",
            trabalho: "Work"
        },
        nav: {
            inicio: "Home",
            veja_mais: "SEE MORE →"
        },
        newsletter: {
            title: "Receive opportunities in your email",
            text: "Subscribe to receive grants, scholarships, free courses, competitions and job openings in Culture, Education, Sports and Work.",
            placeholder: "Enter your email",
            button: "Subscribe"
        },
        footer: {
            description: "Your opportunities portal: grants, scholarships, free courses, competitions and jobs in Culture, Education, Sports and Work.",
            categories: "Categories",
            institucional: "Institutional",
            contato: "Contact",
            sobre: "About us",
            privacidade: "Privacy Policy",
            termos: "Terms of Use",
            copyright: "All rights reserved."
        },
        common: {
            inscricao: "Apply →",
            vagas_continuas: "Continuous openings",
            ate: "Until",
            search_placeholder: "Search opportunities...",
            status_filter: "Status:",
            free_filter: "Free only",
            sort_filter: "Sort by:",
            sort_newest: "Newest",
            sort_deadline: "Deadline ending",
            sort_updated: "Recently updated",
            clear_filters: "Clear filters",
            no_results: "No opportunities available at the moment."
        }
    },
    es: {
        site_title: "CONTESTE.INFO - Oportunidades en Cultura, Educación, Deportes y Trabajo",
        site_description: "Convocatorias, becas, cursos gratuitos, oposiciones y ofertas de empleo en Cultura, Educación, Deportes y Trabajo.",
        hero_title: "Oportunidades que <span class='highlight'>transforman</span> tu futuro",
        hero_subtitle: "Convocatorias, becas, cursos gratuitos, oposiciones y ofertas de empleo en Cultura, Educación, Deportes y Trabajo — todo en un solo lugar.",
        hero_cta: "Ver Oportunidades",
        categories: {
            cultura: "Cultura",
            educacao: "Educación",
            esportes: "Deportes",
            trabalho: "Trabajo"
        },
        nav: {
            inicio: "Inicio",
            veja_mais: "VER MÁS →"
        },
        newsletter: {
            title: "Recibe oportunidades en tu email",
            text: "Suscríbete para recibir convocatorias, becas, cursos gratuitos, oposiciones y ofertas de empleo en Cultura, Educación, Deportes y Trabajo.",
            placeholder: "Ingresa tu email",
            button: "Suscribirse"
        },
        footer: {
            description: "Tu portal de oportunidades: convocatorias, becas, cursos gratuitos, oposiciones y empleos en Cultura, Educación, Deportes y Trabajo.",
            categories: "Categorías",
            institucional: "Institucional",
            contato: "Contacto",
            sobre: "Sobre nosotros",
            privacidade: "Política de Privacidad",
            termos: "Términos de Uso",
            copyright: "Todos los derechos reservados."
        },
        common: {
            inscricao: "Inscríbete →",
            vagas_continuas: "Vacantes continuas",
            ate: "Hasta",
            search_placeholder: "Buscar oportunidades...",
            status_filter: "Estado:",
            free_filter: "Solo gratuitas",
            sort_filter: "Ordenar por:",
            sort_newest: "Más recientes",
            sort_deadline: "Plazo terminando",
            sort_updated: "Actualizadas recientemente",
            clear_filters: "Limpiar filtros",
            no_results: "No hay oportunidades disponibles en este momento."
        }
    }
};

let currentLang = 'pt';

function initLanguageSwitcher() {
    const langBtn = document.getElementById('langBtn');
    const langDropdown = document.getElementById('langDropdown');
    const langOptions = document.querySelectorAll('.lang-option');
    
    if (!langBtn || !langDropdown) return;
    
    // Carregar idioma salvo
    const savedLang = localStorage.getItem('conteste_lang') || 'pt';
    currentLang = savedLang;
    updateLangButton(savedLang);
    
    // Toggle dropdown
    langBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = langDropdown.classList.contains('active');
        langDropdown.classList.toggle('active');
        langBtn.setAttribute('aria-expanded', !isOpen);
    });
    
    // Fechar ao clicar fora
    document.addEventListener('click', function() {
        langDropdown.classList.remove('active');
        langBtn.setAttribute('aria-expanded', 'false');
    });
    
    // Selecionar idioma
    langOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            const lang = this.dataset.lang;
            setLanguage(lang);
            
            // Update active state
            langOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            // Close dropdown
            langDropdown.classList.remove('active');
            langBtn.setAttribute('aria-expanded', 'false');
        });
    });
    
    // Se não estiver na home, mostrar aviso de tradução automática
    if (currentLang !== 'pt') {
        showTranslationNotice(currentLang);
    }
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('conteste_lang', lang);
    updateLangButton(lang);
    applyTranslations(lang);
    
    // Mostrar aviso de tradução
    if (lang !== 'pt') {
        showTranslationNotice(lang);
    } else {
        hideTranslationNotice();
    }
    
    // Atualizar documento
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang;
}

function updateLangButton(lang) {
    const langCurrent = document.querySelector('.lang-current');
    if (langCurrent) {
        langCurrent.textContent = lang.toUpperCase();
    }
}

function applyTranslations(lang) {
    const t = TRANSLATIONS[lang];
    if (!t) return;
    
    // Meta tags
    const titleTag = document.querySelector('title');
    if (titleTag) titleTag.textContent = t.site_title;
    
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = t.site_description;
    
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = t.site_title;
    
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = t.site_description;
    
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.content = t.site_title;
    
    const twitterDesc = document.querySelector('meta[name="twitter:description"]');
    if (twitterDesc) twitterDesc.content = t.site_description;
    
    // Hero
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) heroTitle.innerHTML = t.hero_title;
    
    const heroSubtitle = document.querySelector('.hero-subtitle');
    if (heroSubtitle) heroSubtitle.textContent = t.hero_subtitle;
    
    const heroCta = document.querySelector('.hero .btn');
    if (heroCta) heroCta.textContent = t.hero_cta;
    
    // Navigation
    const navLinks = document.querySelectorAll('.nav-link');
    if (navLinks.length >= 5) {
        navLinks[0].textContent = t.nav.inicio;
        navLinks[1].textContent = t.categories.cultura;
        navLinks[2].textContent = t.categories.educacao;
        navLinks[3].textContent = t.categories.esportes;
        navLinks[4].textContent = t.categories.trabalho;
    }
    
    // Category titles
    const categoryTitles = document.querySelectorAll('.category-title');
    const cats = ['cultura', 'educacao', 'esportes', 'trabalho'];
    categoryTitles.forEach((title, i) => {
        if (i < cats.length) {
            title.textContent = t.categories[cats[i]];
        }
    });
    
    // See more links
    document.querySelectorAll('.see-more').forEach(link => {
        link.textContent = t.nav.veja_mais;
    });
    
    // Newsletter
    const newsletterTitle = document.querySelector('.newsletter-title');
    if (newsletterTitle) newsletterTitle.textContent = t.newsletter.title;
    
    const newsletterText = document.querySelector('.newsletter-text');
    if (newsletterText) newsletterText.textContent = t.newsletter.text;
    
    const newsletterInput = document.querySelector('.newsletter-input');
    if (newsletterInput) newsletterInput.placeholder = t.newsletter.placeholder;
    
    const newsletterBtn = document.querySelector('.newsletter-form button');
    if (newsletterBtn) newsletterBtn.textContent = t.newsletter.button;
    
    // Footer
    const footerDesc = document.querySelector('.footer-description');
    if (footerDesc) footerDesc.textContent = t.footer.description;
    
    const footerTitles = document.querySelectorAll('.footer-title');
    if (footerTitles.length >= 4) {
        footerTitles[0].textContent = t.footer.categories;
        footerTitles[1].textContent = t.footer.institucional;
        footerTitles[2].textContent = t.footer.contato;
    }
    
    // Update search placeholder if exists
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.placeholder = t.common.search_placeholder;
    
    // Update filter labels if exist
    const statusLabel = document.querySelector('label[for="statusFilter"]');
    if (statusLabel) statusLabel.textContent = t.common.status_filter;
    
    const sortLabel = document.querySelector('label[for="sortFilter"]');
    if (sortLabel) sortLabel.textContent = t.common.sort_filter;
    
    const freeLabel = document.querySelector('.checkbox-label');
    if (freeLabel) {
        const checkbox = freeLabel.querySelector('input');
        if (checkbox) {
            const textNode = freeLabel.childNodes[freeLabel.childNodes.length - 1];
            if (textNode.nodeType === Node.TEXT_NODE) {
                textNode.textContent = ' ' + t.common.free_filter;
            }
        }
    }
    
    const clearBtn = document.getElementById('clearFilters');
    if (clearBtn) clearBtn.textContent = t.common.clear_filters;
    
    // Update sort options
    const sortSelect = document.getElementById('sortFilter');
    if (sortSelect) {
        const options = sortSelect.options;
        if (options.length >= 3) {
            options[0].textContent = t.common.sort_newest;
            options[1].textContent = t.common.sort_deadline;
            options[2].textContent = t.common.sort_updated;
        }
    }
}

function showTranslationNotice(lang) {
    // Remove existing notice
    hideTranslationNotice();
    
    const notice = document.createElement('div');
    notice.className = 'translation-notice visible';
    notice.id = 'translationNotice';
    
    const notices = {
        en: "⚠️ This page is automatically translated. Some content may not be accurate. Original language: Portuguese.",
        es: "⚠️ Esta página está traducida automáticamente. Algunos contenidos pueden no ser precisos. Idioma original: Portugués."
    };
    
    notice.textContent = notices[lang] || '';
    
    const header = document.getElementById('header');
    if (header) {
        header.after(notice);
    }
}

function hideTranslationNotice() {
    const existing = document.getElementById('translationNotice');
    if (existing) existing.remove();
}
