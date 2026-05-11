const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Hamburger menu
const burger = document.querySelector('.burger');
const navHeader = document.querySelector('.nav');

if (burger) {
  burger.addEventListener('click', () => {
    const isOpen = navHeader.classList.toggle('nav-open');
    burger.setAttribute('aria-expanded', isOpen);
  });

  document.querySelectorAll('.nav nav a').forEach(link => {
    link.addEventListener('click', () => {
      navHeader.classList.remove('nav-open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });
}