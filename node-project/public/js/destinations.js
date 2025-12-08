const result = document.getElementById("results-grid");
const destination = document.getElementById("result");

const params = new URLSearchParams(window.location.search);
const loc = params.get("details");
details();

async function details() {
    destination.innerHTML = "";
    result.innerHTML = "";
    const res = await fetch(`/api/details/${loc}`);
    const data = await res.json();
    console.log(data);
    destination.innerHTML = `
    <section class="hero">
        <img src="${data.images}" alt="">
        <div class="hero-text">
            <h1><i class="fa-solid fa-location-dot"></i> ${data.city}</h1>
        </div>
    </section>

    <section class="about">
        <h2>About this stay</h2>
        <p class="yet">Mumbai is one of the most beautiful places in India.
        Many great locations of India are present her including Gateway of India, Marine Drive etc.</p>
    </section>`;

    data.hotels.forEach((element) => {
        const card = document.createElement("div");
        card.className = "res";
        card.innerHTML = `
            <div class="card">
            <img src="${element.image}" alt="${escapeHtml(
                element.name
            )}" />
            <p>${escapeHtml(element.name)}</p>
            </div>
        `;

        card.addEventListener('click', () => {
            window.location.href = `products.html?details=${encodeURIComponent(
            element.name
            )}`;
        });
        result.appendChild(card);
    });
}