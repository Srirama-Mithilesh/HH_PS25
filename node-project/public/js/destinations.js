const resultContainer = document.getElementById("results-grid");
const destinationContainer = document.getElementById("result");
const resultsTitle = document.getElementById("results-title");

const params = new URLSearchParams(window.location.search);
const loc = params.get("details");

details();

async function details() {
    destinationContainer.innerHTML = "";
    resultContainer.innerHTML = "";

    const res = await fetch(`/api/details/${loc}`);
    const data = await res.json();
    console.log(data);

    resultsTitle.textContent = `Top Stays in ${data.city}`;

    // HERO + ABOUT SECTION
    destinationContainer.innerHTML = `
        <section class="hero">
            <img src="${data.images}" alt="${data.city}" class="hero-bg-img">
            <div class="hero-overlay"></div>

            <div class="hero-text">
                <div class="location-badge">DESTINATION GUIDE</div>
                <h1>${data.city}</h1>
            </div>
        </section>

        <section class="about">
            <h2>Explore ${data.city}</h2>
            <p>${data.description}</p>

            <div class="section-divider"></div>
        </section>
    `;

    // HOTEL CARDS
    data.hotels.forEach((hotel, index) => {
        const card = document.createElement("div");
        card.className = "res fade-in";
        card.style.animationDelay = `${index * 0.1}s`;

        const safeName = escapeHtml(hotel.name);

        card.innerHTML = `
            <div class="card">
                <div class="card-image-wrapper">
                    <img src="${hotel.image}" alt="${safeName}">
                </div>

                <div class="card-content">
                    <h4>${safeName}</h4>

                    <div class="card-footer">
                        <span class="view-btn">
                            View Property <i class="fa-solid fa-arrow-right"></i>
                        </span>
                    </div>
                </div>
            </div>
        `;

        card.addEventListener("click", () => {
            window.location.href = `products.html?details=${encodeURIComponent(hotel.name)}`;
        });

        setTimeout(() => card.classList.add("visible"), 100);

        resultContainer.appendChild(card);
    });
}


// Helper to avoid XSS
function escapeHtml(text) {
    if (!text) return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// Scroll-to-top button
const scrollBtn = document.getElementById("scrollTopBtn");

window.addEventListener("scroll", () => {
    scrollBtn.style.display = window.scrollY > 300 ? "flex" : "none";
});

scrollBtn.onclick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
};
