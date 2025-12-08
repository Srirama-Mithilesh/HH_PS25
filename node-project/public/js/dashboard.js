document.addEventListener('DOMContentLoaded', () => {
  displayPopularDestinations();
  document.getElementById('search-btn')?.addEventListener('click', handleSearch);
});
function escapeHtml(str) {
  return String(str)  
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function displayPopularDestinations() {
  const container = document.getElementById('Destination');
  if (!container) return;

  try {
    const res = await fetch('/api');
    const data = await res.json();

    if (!Array.isArray(data)) return;

    // Sort by rating desc
    data.sort((a, b) => b.rating - a.rating);


    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'cards';
    cardWrapper.innerHTML = "";
    const initialCount = 6;
    data.forEach((property,index) => {
      const card = document.createElement("div");

      card.innerHTML = `
        <div class="card">
          <img src="${property.images}" alt="${escapeHtml(
            property.city
          )}" />
          <p>${escapeHtml(property.city)}</p>
        </div>
      `;

      // Hide cards after first 6
      /*if (index >= initialCount) {
        card.style.display = "none";
        card.classList.add("extra-card");
      }*/

      card.addEventListener('click', () => {
        window.location.href = `destinations.html?details=${encodeURIComponent(
          property.city
        )}`;
      });

      cardWrapper.appendChild(card);

    });
    
    container.appendChild(cardWrapper);

    // Add the glassy fade dynamically
    cardWrapper.classList.add('cards'); // already added, safe

    // Function to update fade
    function updateScrollableFade(wrapper) {
      if (wrapper.scrollWidth > wrapper.clientWidth) {
        wrapper.classList.add('scrollable');
      } else {
        wrapper.classList.remove('scrollable');
      }
    }

    // Initial check
    updateScrollableFade(cardWrapper);

    // Optional: update on window resize
    window.addEventListener('resize', () => updateScrollableFade(cardWrapper));
    
    // Scroll functionality for left/right buttons
    const scrollLeftBtn = container.querySelector('.scroll-left');
    const scrollRightBtn = container.querySelector('.scroll-right');

    // Create scroll buttons dynamically
    scrollLeftBtn.className = 'scroll-left';
    scrollLeftBtn.innerHTML = '&#8249;'; // left arrow

    scrollRightBtn.className = 'scroll-right';
    scrollRightBtn.innerHTML = '&#8250;'; // right arrow

    container.appendChild(scrollLeftBtn);
    container.appendChild(scrollRightBtn);

    scrollLeftBtn?.addEventListener('click', () => {
      cardWrapper.scrollBy({ left: -300, behavior: 'smooth' });
    });

    scrollRightBtn?.addEventListener('click', () => {
      cardWrapper.scrollBy({ left: 300, behavior: 'smooth' });
    });
    // Only add "See More" if there are more than initialCount
    // Only add toggle button if there are more than initialCount
/*if (data.length > initialCount) {
  const toggleBtn = document.createElement("button");
  toggleBtn.className = "see-more-btn";
  toggleBtn.innerHTML = 'See More <i class="fa-solid fa-chevron-down"></i>';
  toggleBtn.style.marginTop = "1rem";

  toggleBtn.addEventListener("click", () => {
    const hiddenCards = cardWrapper.querySelectorAll(".extra-card");
    const isExpanded = toggleBtn.classList.contains("expanded");

    // Toggle visibility of extra cards
    hiddenCards.forEach(card => {
      card.style.display = isExpanded ? "none" : "block";
    });

    // Toggle expanded class
    toggleBtn.classList.toggle("expanded");

    // Update button text and icon
    if (toggleBtn.classList.contains("expanded")) {
      toggleBtn.innerHTML = 'See Less <i class="fa-solid fa-chevron-down"></i>';
    } else {
      toggleBtn.innerHTML = 'See More <i class="fa-solid fa-chevron-down"></i>';
    }
  });

  container.appendChild(toggleBtn);
}*/

  } catch (err) {
    console.error('Error loading popular destinations:', err);
  }
}

/**
 * Handle search: call /api/search and render results.
 */
async function handleSearch() {
  const destinationInput = document.getElementById('destination-input');
  const guestsSelect = document.getElementById('guests-select');
  const resultsSubtitle = document.getElementById('results-subtitle');
  const resultsGrid = document.getElementById('results-grid');

  if (!destinationInput || !guestsSelect || !resultsSubtitle || !resultsGrid) {
    return;
  }

  const destination = destinationInput.value.trim();
  const guests = guestsSelect.value;

  if (!destination) {
    alert('Please enter a destination.');
    return;
  }

  // Clear old results
  resultsGrid.innerHTML = '';
  resultsSubtitle.textContent = 'Searching...';

  try {
    const params = new URLSearchParams({
      destination,
      guests,
    });

    const res = await fetch(`/api/search?${params.toString()}`);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      resultsSubtitle.textContent = 'No stays found for that search.';
      return;
    }

    resultsSubtitle.textContent = `Found ${data.length} stay(s):`;

    data.forEach((property) => {
      const card = document.createElement('div');
      card.className = 'result-card';

      const img = document.createElement('img');
      img.src = property.image;
      img.alt = property.name;

      const body = document.createElement('div');
      body.className = 'result-card-body';

      const title = document.createElement('div');
      title.className = 'result-title';
      title.textContent = property.name;

      const city = document.createElement('div');
      city.className = 'result-subtitle';
      city.textContent = property.city;
      /*
      const desc = document.createElement('div');
      desc.className = 'result-description';
      desc.textContent = property.description;
      

      const price = document.createElement('div');
      price.className = 'result-price';
      price.textContent = `₹${property.pricePerNight} / night · up to ${property.maxGuests} guests`;
      */
     const addrss=document.createElement('div');
     addrss.className='result-address';
     addrss.textContent=property.address;

      body.appendChild(title);
      body.appendChild(city);
      body.appendChild(addrss);
      //body.appendChild(desc);
      //body.appendChild(price);

      card.appendChild(img);
      card.appendChild(body);

      card.addEventListener('click', () => {
        window.location.href = `products.html?details=${encodeURIComponent(
          property.name
        )}`;
      });

      resultsGrid.appendChild(card);
    });

    // Scroll to results
    document.getElementById('results-section').scrollIntoView({
      behavior: 'smooth',
    });
  } catch (err) {
    console.error('Search error:', err);
    resultsSubtitle.textContent = 'Something went wrong. Please try again.';
  }
}