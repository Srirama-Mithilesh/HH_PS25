// js/destinations.js
// Robust details loader + smooth shrink-on-scroll hero

document.addEventListener("DOMContentLoaded", () => {
  // DOM-ready: start app
  initDetailsAndScroll();
});

async function initDetailsAndScroll() {
  const resultContainer = document.getElementById("results-grid");
  const destinationContainer = document.getElementById("result");
  const resultsTitle = document.getElementById("results-title");

  // Fetch and render details
  const params = new URLSearchParams(window.location.search);
  const loc = params.get("details");
  await details(loc);

  // Setup scroll animation after DOM elements are rendered
  setupHeroScroll();
}

/* ---------- details() (renders hero + cards) ---------- */
async function details(loc) {
  const resultContainer = document.getElementById("results-grid");
  const destinationContainer = document.getElementById("result");
  const resultsTitle = document.getElementById("results-title");

  if (!loc) return; // nothing to fetch

  destinationContainer.innerHTML = "";
  resultContainer.innerHTML = "";
  resultsTitle.textContent = "";

  let data;
  try {
    const res = await fetch(`/api/details/${encodeURIComponent(loc)}`);
    data = await res.json();
  } catch (err) {
    console.error("Failed to fetch details:", err);
    destinationContainer.innerHTML = `<p style="padding:2rem; text-align:center">Could not load destination.</p>`;
    return;
  }

  resultsTitle.textContent = `Top Stays in ${data.city || ""}`;

  // HERO + ABOUT SECTION
  destinationContainer.innerHTML = `
    <section class="hero">
      <img src="${data.images}" alt="${escapeHtml(data.city)}" class="hero-bg-img">
      <div class="hero-overlay"></div>
      <div class="hero-text">
        <div class="location-badge">DESTINATION GUIDE</div>
        <h1>${escapeHtml(data.city)}</h1>
      </div>
    </section>

    <section class="about">
      <h2>Explore ${escapeHtml(data.city)}</h2>
      <p>${escapeHtml(data.description)}</p>
      <div class="section-divider"></div>
    </section>
  `;

  // HOTEL CARDS
  (data.hotels || []).forEach((hotel, index) => {
    const card = document.createElement("div");
    card.className = "res fade-in";
    card.style.animationDelay = `${index * 0.08}s`;

    const safeName = escapeHtml(hotel.name || "Property");

    card.innerHTML = `
      <div class="card">
        <div class="card-image-wrapper">
          <img src="${hotel.image}" alt="${safeName}">
        </div>
        <div class="card-content">
          <h4>${safeName}</h4>
          <div class="card-footer">
            <div class="rating"><i class="fa-solid fa-star"></i> ${hotel.rating || "4.8"}</div>
            <span class="view-btn">View Property <i class="fa-solid fa-arrow-right"></i></span>
          </div>
        </div>
      </div>
    `;

    card.addEventListener("click", () => {
      window.location.href = `products.html?details=${encodeURIComponent(hotel.name)}`;
    });

    // small deferred reveal
    requestAnimationFrame(() => {
      card.classList.add("visible");
    });

    resultContainer.appendChild(card);
  });
}

/* ---------- escapeHtml helper ---------- */
function escapeHtml(text) {
  if (text === undefined || text === null) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ---------- Scroll shrink code ---------- */
function setupHeroScroll() {
  const hero = document.querySelector(".hero");
  const heroText = document.querySelector(".hero-text");
  const heroImg = document.querySelector(".hero-bg-img");

  if (!hero || !heroText || !heroImg) {
    // nothing to animate
    return;
  }

  // Initial values and clamps
  const fullHeightVh = 100;   // start at 100vh
  const minHeightVh = 60;     // shrink to 60vh
  const startShrinkPx = 0;    // when scrolling starts
  const endShrinkPx = 420;    // pixel distance to finish shrink (tweakable)

  let latestScrollY = 0;
  let ticking = false;

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  // run once to set initial state
  onScroll();

  function onScroll() {
    latestScrollY = window.scrollY || window.pageYOffset || 0;
    if (!ticking) {
      window.requestAnimationFrame(updateHero);
      ticking = true;
    }
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function updateHero() {
        ticking = false;

        const progress = clamp(latestScrollY / endShrinkPx, 0, 1);

        /* ---------- HERO HEIGHT SHRINK ---------- */
        const newHeightVh = lerp(fullHeightVh, minHeightVh, progress);
        hero.style.height = newHeightVh + "vh";

        /* ---------- IMAGE SHRINK ---------- */
        const imgScale = lerp(1.15, 1.0, progress); // smooth zoom-out
        heroImg.style.transform = `scale(${imgScale})`;

        /* ---------- TEXT SHRINK (controlled min scale) ---------- */
        /* ----- HERO TEXT SHRINK BIG → SMALL ----- */
        const maxTextScale = 1.4;   // how BIG text is at the top
        const minTextScale = 0.78;  // smallest allowable size

        // linear interpolation between large and small
        let textScale = lerp(maxTextScale, minTextScale, progress);

        // apply transform
        const textTranslate = lerp(0, -40, progress);
        heroText.style.transform = `
            translateY(${textTranslate}px)
            scale(${textScale})
        `;


        /* ---------- Optional overlay fade ---------- */
        const overlay = hero.querySelector(".hero-overlay");
        if (overlay) {
            overlay.style.opacity = String(lerp(1, 0.95, progress));
        }
    }

}
