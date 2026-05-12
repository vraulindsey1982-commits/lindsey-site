// Avis Google
async function loadReviews() {
  try {
    const res = await fetch('/api/reviews');
    if (!res.ok) return;
    const { reviews, rating, total } = await res.json();

    if (rating) {
      const stars = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
      document.getElementById('reviews-stars').textContent = stars;
      document.getElementById('reviews-score').textContent = rating.toFixed(1);
      document.getElementById('reviews-count').textContent = `(${total} avis)`;
      document.getElementById('reviews-rating').style.display = 'flex';
    }

    if (reviews && reviews.length) {
      const container = document.getElementById('reviews-container');
      container.innerHTML = reviews.map(r => `
        <blockquote>
          <div class="review-meta">
            <span class="review-author">${r.author_name}</span>
            <span class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
          </div>
          <p class="review-text">"${r.text}"</p>
          <span class="review-date">${r.relative_time_description}</span>
        </blockquote>
      `).join('');
    }

    const link = document.getElementById('reviews-link');
    if (link) link.style.display = 'inline-block';
  } catch (e) {}
}

if ('requestIdleCallback' in window) {
  requestIdleCallback(loadReviews, { timeout: 5000 });
} else {
  window.addEventListener('load', loadReviews);
}

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
