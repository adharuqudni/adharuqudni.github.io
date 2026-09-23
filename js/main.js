/* Progressive enhancement: the portfolio's content never depends on JavaScript. */
(() => {
  'use strict';
  document.documentElement.classList.add('js');

  const toggle = document.getElementById('nav-toggle');
  const navigation = document.getElementById('primary-links');
  const mobile = window.matchMedia('(max-width: 760px)');

  function closeNavigation(restoreFocus = false) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
    navigation.classList.remove('is-open');
    if (restoreFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    navigation.classList.toggle('is-open', open);
  });
  document.querySelector('.site-header .wordmark').addEventListener('click', () => closeNavigation());
  navigation.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      closeNavigation();
      if (!mobile.matches) return;
      const target = document.querySelector(link.hash);
      if (target) {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
      }
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') closeNavigation(true);
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeNavigation();
  });
  document.addEventListener('focusin', event => {
    if (!event.target.closest('.site-header')) closeNavigation();
  });
  mobile.addEventListener('change', () => {
    const focusWillHide = mobile.matches && navigation.contains(document.activeElement);
    closeNavigation(focusWillHide);
  });

  const filterButtons = [...document.querySelectorAll('[data-filter]')];
  const projects = [...document.querySelectorAll('[data-category]')];
  const archive = document.getElementById('project-archive');
  const filterStatus = document.getElementById('filter-status');
  const validFilters = new Set(filterButtons.map(button => button.dataset.filter));

  function applyFilter(value, announce = false) {
    const filter = validFilters.has(value) ? value : 'all';
    let count = 0;
    projects.forEach(project => {
      project.hidden = filter !== 'all' && project.dataset.category !== filter;
      if (!project.hidden) count++;
    });
    filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
    if (announce) filterStatus.textContent = count + ' projects shown';
    return filter;
  }
  function restoreFilter() {
    const requested = new URL(window.location.href).searchParams.get('filter');
    applyFilter(requested);
    if (requested && validFilters.has(requested)) archive.open = true;
  }
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const filter = applyFilter(button.dataset.filter, true);
      const url = new URL(window.location.href);
      if (filter === 'all') url.searchParams.delete('filter');
      else url.searchParams.set('filter', filter);
      url.hash = 'projects';
      if (url.href !== window.location.href) window.history.pushState(null, '', url);
    });
  });
  window.addEventListener('popstate', restoreFilter);
  restoreFilter();

  const copyButton = document.getElementById('copy-email');
  const contactStatus = document.getElementById('contact-status');
  copyButton.addEventListener('click', async () => {
    contactStatus.textContent = '';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText('annas.adharuqudni@gmail.com');
      contactStatus.textContent = 'Email address copied.';
    } catch {
      contactStatus.textContent = 'Select the email address to copy it, or click it to send a message.';
    }
  });

  // Reflect the section currently being read without changing browser history.
  const navLinks = [...navigation.querySelectorAll('a')];
  const sections = [...document.querySelectorAll('main > section[id]')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        navLinks.forEach(link => {
          if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      }
    }, { rootMargin: '-15% 0px -55% 0px', threshold: 0 });
    sections.forEach(section => observer.observe(section));
  }
})();
