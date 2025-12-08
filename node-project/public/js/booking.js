// booking.js  (ES MODULE VERSION)

// ----------------------
// DOM ELEMENTS
// ----------------------
const hotelNameEl = document.getElementById("hotelName");
const roomTypeSelect = document.getElementById("roomType");
const priceDisplay = document.getElementById("priceDisplay");
const confirmBtn = document.getElementById("confirmBtn");

const checkinEl = document.getElementById("checkin");
const checkoutEl = document.getElementById("checkout");
const guestsEl = document.getElementById("guests");
const paymentEl = document.getElementById("payment");

// ----------------------
// IMAGE SLIDER STATE
// ----------------------
let imageElements = [];
let currentIndex = 0;

// Initialize image elements immediately so buttons work from start
function initGalleryElements() {
    imageElements = [
        document.getElementById("img1"),
        document.getElementById("img2"),
        document.getElementById("img3"),
    ];
}
initGalleryElements(); // ⭐ IMPORTANT FIX
document.getElementById("prevBtn").addEventListener("click", prevImg);
document.getElementById("nextBtn").addEventListener("click", nextImg);


// Load images (3 max)
function updateGalleryImages(images = []) {
    // fallback images
    const img1 = images[0] || "img/default.png";
    const img2 = images[1] || img1;
    const img3 = images[2] || img1;

    imageElements[0].src = img1;
    imageElements[1].src = img2;
    imageElements[2].src = img3;

    imageElements.forEach((img, i) =>
        img.classList.toggle("active", i === 0)
    );

    currentIndex = 0;
}

function showImg(index) {
    imageElements.forEach((img, i) => {
        img.classList.toggle("active", i === index);
    });
}

function nextImg() {
    currentIndex = (currentIndex + 1) % imageElements.length;
    showImg(currentIndex);
}

function prevImg() {
    currentIndex = (currentIndex - 1 + imageElements.length) % imageElements.length;
    showImg(currentIndex);
}

// Expose globally for HTML buttons
window.nextImg = nextImg;
window.prevImg = prevImg;

// ----------------------
// URL PARAM READING
// ----------------------
function getHotelId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("hotel_id") || params.get("id") || null;
}

const hotelId = getHotelId();



// ----------------------
// LOAD HOTEL + ROOMS
// ----------------------
async function loadHotelData() {
    const res = await fetch(`/api/hotels/${hotelId}/booking`);
    
    if (!res.ok) {
        console.error("Booking API error:", await res.text());
        alert("Failed to load hotel data.");
        return;
    }

    const data = await res.json();
    console.log(data);

//     if (!hotelId) {
//         alert("Missing hotel_id in URL");
//         return;
//     }

//     // Load hotel name
//     const { data: hotel, error: hotelErr } = await supabase
//         .from("hotels")
//         .select("name")
//         .eq("id", hotelId)
//         .single();

//     if (hotelErr) {
//         console.error(hotelErr);
//         return;
//     }

//     hotelNameEl.textContent = hotel.name;

//     // Load rooms
//     const { data: rooms, error: roomsErr } = await supabase
//         .from("rooms")
//         .select("*")
//         .eq("hotel_id", hotelId)
//         .eq("is_available", true);

//     if (roomsErr) {
//         console.error(roomsErr);
//         return;
//     }

    roomTypeSelect.innerHTML = `<option disabled selected>Select room type</option>`;

    data.rooms.forEach((room) => {
        const opt = document.createElement("option");
        opt.value = room.id;
        opt.textContent = `${room.room_type} (Room ${room.room_number})`;
        opt.dataset.price = room.price_per_night;
        opt.dataset.images = JSON.stringify(room.images ?? []);
        roomTypeSelect.appendChild(opt);
    });
}

// ----------------------
// ON ROOM CHANGE
// ----------------------

roomTypeSelect.addEventListener("change", () => {
    const selected = roomTypeSelect.options[roomTypeSelect.selectedIndex];

    // price
    priceDisplay.textContent = `₹ ${selected.dataset.price}`;

    // images
    let imgs = [];
    try {
        imgs = JSON.parse(selected.dataset.images);
    } catch {
        imgs = [];
    }

    updateGalleryImages(imgs);
});

// ----------------------
// CONFIRM BOOKING
// ----------------------


confirmBtn.addEventListener("click", async () => {
    const selected = roomTypeSelect.options[roomTypeSelect.selectedIndex];
    const price = selected.dataset.price;
    const roomId = roomTypeSelect.value;
    const checkin = checkinEl.value;
    const checkout = checkoutEl.value;
    const guests = guestsEl.value;
    const payment = paymentEl.value;

    const token = localStorage.getItem("token");

    if (!token) {
        alert("You must log in to book a room.");
        return;
    }

    if (!roomId || !checkin || !checkout || !guests || !payment) {
        alert("Please fill all fields!");
        return;
    }

    try {
        const response = await fetch(`/api/confirmBooking`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                roomId,
                checkin,
                checkout,
                price,
                guests,
                payment
            }),
        });

        const contentType = response.headers.get("content-type");

        let data;
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = { message: "Booking Successful" };
        }

        console.log("API Response:", data);

        if (response.ok) {

            // Show booking success modal
            const modal = document.getElementById("bookingModal");
            const closeModal = document.getElementById("closeModal");
            const okBtn = document.getElementById("okBtn");

            modal.style.display = "block";

            closeModal.onclick = () => modal.style.display = "none";
            okBtn.onclick = () => window.location.href = "dashboard.html";
            window.onclick = (event) => {
                if (event.target === modal) modal.style.display = "none";
            };

        } else {
            alert("Booking failed: " + data.message);
        }

    } catch (err) {
        console.error("Fetch Error:", err);
        alert("An error occurred. Try again.");
    }
});
loadHotelData();