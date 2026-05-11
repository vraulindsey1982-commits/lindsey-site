const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Formulaire de contact
const form = document.getElementById("contact-form");
if (form) {
  const successMsg = document.getElementById("form-success");
  form.addEventListener("submit", async function(e) {
    e.preventDefault();
    const response = await fetch(form.action, {
      method: form.method,
      body: new FormData(form),
      headers: { "Accept": "application/json" }
    });
    if (response.ok) {
      form.reset();
      successMsg.style.display = "block";
    } else {
      alert("Oops… il y a un problème. Réessaie !");
    }
  });
}

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