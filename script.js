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

// Embeds Instagram : chargés seulement quand la section approche du viewport,
// puis on ajoute un title accessible aux iframes générées par le script Instagram
const igGrid = document.querySelector('.instagram-embed-grid');
if (igGrid) {
  const titleIgIframes = () => {
    igGrid.querySelectorAll('iframe:not([title])').forEach((iframe, i) => {
      const post = iframe.closest('.instagram-media');
      const permalink = post ? post.getAttribute('data-instgrm-permalink') : null;
      const match = permalink && permalink.match(/\/reel\/([^/]+)/);
      iframe.title = match ? `Publication Instagram Lindsey : ${match[1]}` : `Publication Instagram Lindsey ${i + 1}`;
    });
  };
  new MutationObserver(titleIgIframes).observe(igGrid, { childList: true, subtree: true });

  const loadIgEmbed = () => {
    if (window._igEmbedLoaded) return;
    window._igEmbedLoaded = true;
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.instagram.com/embed.js';
    document.body.appendChild(s);
  };
  const igObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadIgEmbed();
        igObserver.disconnect();
      }
    });
  }, { rootMargin: '200px' });
  igObserver.observe(igGrid);
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
