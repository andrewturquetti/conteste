/**
 * CONTESTE.INFO - JavaScript Principal
 */

document.addEventListener('DOMContentLoaded', function() {
    initMobileMenu();
    initScrollEffects();
    initNewsletterForm();
    initScrollAnimations();
    initOpportunities();
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
const BUTTONDOWN_USERNAME = 'SEU_USUARIO_BUTTONDOWN';

function initNewsletterForm() {
    const form = document.getElementById('newsletterForm');
    if (!form) return;

    const isConfigured = BUTTONDOWN_USERNAME !== 'SEU_USUARIO_BUTTONDOWN';
    if (isConfigured) {
        form.action = 'https://buttondown.com/api/emails/embed-subscribe/' + BUTTONDOWN_USERNAME;
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

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `<span>${message}</span><button style="background:none;border:none;color:white;font-size:1.25rem;cursor:pointer;">&times;</button>`;
    notification.style.cssText = `position:fixed;bottom:20px;right:20px;padding:1rem 1.5rem;background-color:${type === 'success' ? '#10b981' : '#ef4444'};color:white;border-radius:0.75rem;box-shadow:0 10px 25px rgba(0,0,0,0.2);display:flex;align-items:center;gap:1rem;z-index:9999;animation:slideIn 0.3s ease;max-width:400px;`;

    const style = document.createElement('style');
    style.textContent = '@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}';
    document.head.appendChild(style);

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
 * O conteúdo vem de data/oportunidades.json, uma base curada manualmente (pesquisada
 * e verificada uma a uma — link oficial e imagem confirmados). Para atualizar,
 * regenere esse arquivo com uma nova pesquisa e rode scripts/gerar-conteudo-diario.js
 * para produzir o relatório de newsletter e o pacote de imagens para redes sociais.
 */
function initOpportunities() {
    const sections = document.querySelectorAll('.category-section[id]');
    const isHomepage = sections.length > 1;
    const limit = isHomepage ? 3 : 99;

    fetch('data/oportunidades.json')
        .then(function(res) {
            if (!res.ok) throw new Error('Falha ao carregar oportunidades: ' + res.status);
            return res.json();
        })
        .then(function(data) {
            const all = (Array.isArray(data.opportunities) ? data.opportunities : []).slice().sort(function(a, b) {
                return (b.added_at || '').localeCompare(a.added_at || '');
            });
            sections.forEach(function(section) {
                const grid = section.querySelector('.news-grid');
                if (!grid) return;
                const items = all.filter(function(item) { return item.category === section.id; }).slice(0, limit);
                if (!items.length) return;
                grid.innerHTML = items.map(renderOpportunityCard).join('');
                grid.querySelectorAll('.news-card').forEach(function(card) {
                    card.classList.add('scroll-animate', 'visible');
                });
            });
        })
        .catch(function(err) {
            console.warn('[CONTESTE.INFO] Não foi possível carregar oportunidades, mantendo conteúdo padrão.', err);
        });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function renderOpportunityCard(item) {
    const isOngoing = item.deadline === 'Vagas contínuas';
    const deadlineLabel = isOngoing ? 'Vagas contínuas' : 'Até ' + item.deadline;
    return '<article class="news-card opportunity-card">' +
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