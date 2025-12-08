// public/js/proscript.js
// Assumes this file is included on the hotel details page
let hotelGlobalID = null;

const result = document.getElementById('result');
const roomsContainer = document.getElementById('results-grid');
const params = new URLSearchParams(window.location.search);
const loc = params.get('details'); // e.g. ?details=HotelName
const checkIn = params.get('checkIn') || null;
const checkOut = params.get('checkOut') || null;

if (loc) {
  details();
  availble();
} else {
  // no destination - show friendly message
  if (result) result.innerHTML = '<p>No destination specified.</p>';
}

async function details() {
  if (!result) return;
  result.innerHTML = '';

  try {
    const res = await fetch(`/api/search/details/${encodeURIComponent(loc)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Server error:', err);
      result.innerHTML = `<p>${err.message || 'Failed to fetch hotel details.'}</p>`;
      return;
    }

    const data = await res.json();
    hotelGlobalID = data.id || data?.hotels?.[0]?.id || null;

    const card = document.createElement('div');
    card.className = 'res';
    card.innerHTML = `
      <section class="hero">
        <img src="${data.image || 'placeholder.jpg'}" class="hero-bg" alt="${data.name || ''}">
        <div class="hero-text">
          <h1>${data.name || 'Hotel'}</h1>
          <p><i class="fa-solid fa-location-dot"></i> ${data.city || ''}</p>
        </div>
      </section>

      <main class="container">
        <div class="info-section" style="display:flex; gap:1rem;">
          <section class="about">
            <div class="about-box">
              <h2>About this stay</h2>
              <p>${data.description || 'No description available.'}</p>
            </div>
          </section>

          <aside class="reviews">
            <div class="review-header" style="display:flex; justify-content:space-between; align-items:center;">
              <h3>Guest Reviews</h3>
              <div id="avg-rating" class="rating" style="font-weight:500; font-size:1rem;"></div>
            </div>

            <div id="reviews-container">
              <p>Loading reviews...</p>
            </div>

            <button class="review-btn" data-hotel-id="${data.id || ''}" id="submitReviewBtn">Add A Review</button>
          </aside>
        </div>

        <section class="amenities">
          <h2>Premium Amenities</h2>
          <div class="grid"></div>
        </section>
      </main>
    `;

    result.appendChild(card);

    // fetch amenities
    try {
      const amenitiesRes = await fetch(`/api/hotels/${data.id}/amenities`);
      if (amenitiesRes.ok) {
        const amenities = await amenitiesRes.json();
        const amenitiesContainer = document.querySelector('.amenities .grid');
        amenitiesContainer.innerHTML = '';
        if (Array.isArray(amenities) && amenities.length > 0) {
          amenities.forEach((name) => {
            const div = document.createElement('div');
            div.className = 'amenity';
            div.innerHTML = `<i class="fa-solid fa-check"></i> ${name}`;
            amenitiesContainer.appendChild(div);
          });
        } else {
          amenitiesContainer.innerHTML = '<p>No amenities listed.</p>';
        }
      } else {
        document.querySelector('.amenities .grid').innerHTML = `<p>Unable to load amenities.</p>`;
      }
    } catch (e) {
      console.error('Amenities error:', e);
      const el = document.querySelector('.amenities .grid');
      if (el) el.innerHTML = `<p>Unable to load amenities.</p>`;
    }

    // fetch reviews
    const reviewsContainer = document.getElementById('reviews-container');
    try {
      const reviewsRes = await fetch(`/api/reviews?hotel_id=${data.id}`);
      if (!reviewsRes.ok) throw new Error('Failed to fetch reviews');
      const reviews = await reviewsRes.json();

      let avgRating = 0;
      if (Array.isArray(reviews) && reviews.length > 0) {
        const sum = reviews.reduce((t, r) => t + (r.rating || 0), 0);
        avgRating = (sum / reviews.length).toFixed(1);
        document.getElementById('avg-rating').innerHTML = `<i class="fa-solid fa-star"></i> ${avgRating} (${reviews.length})`;
      } else {
        document.getElementById('avg-rating').innerHTML = `<i class="fa-solid fa-star"></i> 0`;
        reviewsContainer.innerHTML = `<p>No reviews yet.</p>`;
      }

      if (Array.isArray(reviews) && reviews.length > 0) {
        reviewsContainer.innerHTML = '';
        reviews.forEach((review) => {
          const reviewDiv = document.createElement('div');
          reviewDiv.className = 'review';
          reviewDiv.innerHTML = `
            <h4>${review.user_email || 'Guest'} <span>${'★'.repeat(review.rating || 0)}</span></h4>
            <p>"${review.review_text || ''}"</p>
          `;
          reviewsContainer.appendChild(reviewDiv);
        });
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      if (reviewsContainer) reviewsContainer.innerHTML = `<p>Unable to load reviews.</p>`;
    }
  } catch (err) {
    console.error('details() error:', err);
    if (result) result.innerHTML = `<p>Unable to load hotel details.</p>`;
  }
}

async function availble() {
  if (!roomsContainer) return;
  roomsContainer.innerHTML = '';

  try {
    const res = await fetch(`/api/search/details/${encodeURIComponent(loc)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Server error:', err);
      roomsContainer.innerHTML = `<p>${err.message || 'Failed to fetch rooms.'}</p>`;
      return;
    }

    const data = await res.json();
    const rooms = data.rooms || [];

    if (!Array.isArray(rooms) || rooms.length === 0) {
      roomsContainer.innerHTML = `<p>No rooms available for these dates.</p>`;
      return;
    }

    rooms.forEach((room) => {
      const card = document.createElement('div');
      card.className = 'result-card';

      const img = document.createElement('img');
      img.src = (room.images && room.images[0]) || 'placeholder.jpg';
      img.alt = room.room_type || '';

      const title = document.createElement('div');
      title.className = 'result-title';
      title.textContent = room.room_type || 'Room';

      const body = document.createElement('div');
      body.className = 'result-card-body';

      const price = document.createElement('div');
      price.className = 'result-price';
      price.textContent = `₹${room.price_per_night || 'N/A'} / night · up to ${room.max_guests || 1} guests`;

      const amenitiesDiv = document.createElement('div');
      amenitiesDiv.className = 'room-amenities';

      const amenitiesList = room.amenities || [];
      if (Array.isArray(amenitiesList) && amenitiesList.length > 0) {
        amenitiesList.forEach((amenity) => {
          const amenityItem = document.createElement('div');
          amenityItem.className = 'amenity-item';
          const name = amenity.name || amenity.amenities?.name || '';
          amenityItem.innerHTML = `<i class="fa-solid fa-check"></i> ${name}`;
          amenitiesDiv.appendChild(amenityItem);
        });
      } else {
        amenitiesDiv.innerHTML = `<div class="amenity-item">No amenities listed</div>`;
      }

      body.appendChild(title);
      body.appendChild(price);
      body.appendChild(amenitiesDiv);

      card.appendChild(img);
      card.appendChild(body);
      roomsContainer.appendChild(card);
    });
  } catch (err) {
    console.error('availble() error:', err);
    roomsContainer.innerHTML = `<p>Unable to load rooms.</p>`;
  }

  // Book button behaviour
  const bookBtn = document.getElementById('bookRoomBtn');
  if (bookBtn) {
    bookBtn.textContent = 'Book Your Room';
    bookBtn.onclick = () => {
      const token = localStorage.getItem('token') || localStorage.getItem('supabase_access_token');
      const hotelId = hotelGlobalID;
      if (!hotelId) {
        console.error('Hotel ID missing!');
        return;
      }
      if (token) {
        window.location.href = `./booking.html?hotel_id=${hotelId}`;
      } else {
        redirectToLogin();
      }
    };
  }
}

// review modal handling
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('review-btn')) {
    const token = localStorage.getItem('token') || localStorage.getItem('supabase_access_token');
    if (!token) {
      alert('You must be logged in to submit a review');
      return;
    }
    const hotelId = e.target.getAttribute('data-hotel-id');
    openReviewModal(hotelId);
  }
});

function openReviewModal(hotelId) {
  const modal = document.getElementById('reviewModal');
  if (!modal) return;
  modal.style.display = 'block';

  const submitBtn = document.getElementById('submitReviewModalBtn');
  if (!submitBtn) return;

  submitBtn.onclick = null;
  submitBtn.onclick = async () => {
    const token = localStorage.getItem('token') || localStorage.getItem('supabase_access_token');
    if (!token) {
      alert('You must be logged in to submit a review');
      return;
    }
    const rating = document.getElementById('ratingInput').value;
    const review = document.getElementById('reviewInput').value;

    try {
      const res = await fetch(`/api/hotels/${hotelId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating: Number(rating), review_text: review }),
      });

      const data = await res.json();
      if (!res.ok) throw data;

      modal.style.display = 'none';
      await details();

      const notif = document.getElementById('notification');
      if (notif) {
        notif.style.display = 'flex';
        setTimeout(() => (notif.style.display = 'none'), 3000);
      }

      document.getElementById('ratingInput').value = '1';
      document.getElementById('reviewInput').value = '';
    } catch (err) {
      console.error('submit review err:', err);
      alert('Failed to submit review. Check console.');
    }
  };
}

// Close modal handlers
const closeBtn = document.getElementById('closeReviewModal');
if (closeBtn) closeBtn.onclick = () => (document.getElementById('reviewModal').style.display = 'none');

window.onclick = (event) => {
  const modal = document.getElementById('reviewModal');
  if (event.target === modal) modal.style.display = 'none';
};

// redirect to login helper (replace with your app's flow)
function redirectToLogin() {
  // Example: go to login page and then return
  window.location.href = '/login.html';
}
