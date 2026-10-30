/* ───────────────────────────────────────────────
   public/js/main.js  —  SkillBridge Global JS
─────────────────────────────────────────────── */

/* ── Mobile nav toggle ─────────────────────── */
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen);
  });

  // Close nav when clicking outside
  document.addEventListener('click', (e) => {
    if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

/* ── Stats counter animation ───────────────── */
function animateCounters() {
  const counters = document.querySelectorAll('[data-target]');
  counters.forEach(counter => {
    const target   = parseInt(counter.dataset.target, 10);
    const duration = 1800;
    const step     = target / (duration / 16);
    let current    = 0;

    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        counter.textContent = target;
        clearInterval(timer);
      } else {
        counter.textContent = Math.floor(current);
      }
    }, 16);
  });
}

const statsBar = document.querySelector('.stats-bar');
if (statsBar) {
  const observer = new IntersectionObserver(
    entries => {
      if (entries[0].isIntersecting) {
        animateCounters();
        observer.disconnect();
      }
    },
    { threshold: 0.3 }
  );
  observer.observe(statsBar);
}

/* ── Scroll-reveal for cards ───────────────── */
const revealTargets = document.querySelectorAll(
  '.step-card, .role-card, .feature-card'
);
if (revealTargets.length > 0 && 'IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          entry.target.style.animationDelay = `${i * 0.07}s`;
          entry.target.classList.add('fade-up');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealTargets.forEach(el => revealObserver.observe(el));
}

/* ── Auto-dismiss flash messages ───────────── */
const flashMessages = document.querySelectorAll('.flash');
flashMessages.forEach(flash => {
  setTimeout(() => {
    flash.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    flash.style.opacity    = '0';
    flash.style.transform  = 'translateY(-8px)';
    setTimeout(() => flash.remove(), 400);
  }, 5000);
});

/* ── Active nav link highlight ─────────────── */
const currentPath = window.location.pathname;
document.querySelectorAll('.nav-link').forEach(link => {
  const href = link.getAttribute('href');
  if (href && href !== '#' && (href === currentPath || (href !== '/' && currentPath.startsWith(href)))) {
    link.classList.add('nav-link-active');
  }
});

/* ── Dropdown keyboard accessibility ────────── */
document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
  const toggle = dropdown.querySelector('.dropdown-toggle');
  const menu   = dropdown.querySelector('.dropdown-menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menu.style.display === 'block';
    // Close all other dropdowns
    document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
    menu.style.display = isOpen ? 'none' : 'block';
    toggle.setAttribute('aria-expanded', !isOpen);
  });
});

console.log('🎓 SkillBridge JS loaded');
