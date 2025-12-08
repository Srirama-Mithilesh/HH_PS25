function showSuccessPopup(title, message) {
    document.getElementById("successTitle").innerText = title;
    document.getElementById("successMessage").innerText = message;
    document.getElementById("successModal").style.display = "flex";
}

// ✅ CLOSE SUCCESS POPUP
document.getElementById("successOkBtn").addEventListener("click", () => {
    document.getElementById("successModal").style.display = "none";
});


// =========================
// Load all properties
// =========================
bookingDetails();

async function bookingDetails() {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
        console.log("Invalid or expired token.");
        localStorage.removeItem("token");
        return;
    }

    const data = await res.json();
    const user = data.user;
    const email = user?.email;
    const userId = user?.id;

    // Load properties owned by admin
    const response = await fetch(`/api/properties/${userId}`);
    const properties = await response.json();
    console.log(properties);

    const listContainer = document.getElementById("property-list");
    listContainer.innerHTML = ""; // clear skeleton loaders

    if (properties.length === 0) {
        listContainer.innerHTML = `<p style="color:#64748B;">No properties added yet.</p>`;
        return;
    }

    properties.forEach(p => {
        const card = document.createElement("div");
        card.classList.add("property-card-modern");
        const prices = p.rooms.map(item => item.price_per_night);

        const roomsHTML = (p.rooms ?? [])
            .map(room => `
                <span class="room-tag">
                    <span style="color:green;font-size:20px;">•</span>
                    ${room.room_type}
                </span>
            `)
            .join("");

        card.innerHTML = `
            <div class="prop-img-wrapper" style="position:relative;">
                <img src="${p.image || 'https://via.placeholder.com/1200x400'}">

                <div style="
                    position:absolute;
                    bottom:12px;
                    right:12px;
                    background:#FFFFFF;
                    color:#000000;
                    padding:6px 12px;
                    border-radius:20px;
                    font-weight:600;
                    display:flex;
                    align-items:center;
                    gap:6px;
                ">
                    ⭐ 4.9
                </div>
            </div>

            <div class="prop-content">

                <h2 class="prop-title" style="color:#2563EB; font-size:22px; font-weight:700;">
                    ${p.name}
                </h2>

                <p class="prop-location" style="color:#64748B; display:flex; align-items:center; gap:6px;">
                    📍 ${p.city}
                </p>

                <p class="prop-desc" style="margin-top:10px; color:#555;">
                    ${p.description || "No description available."}
                </p>

                <div class="room-tags" style="margin-top:20px; display:flex; gap:12px;">
                    ${roomsHTML}
                </div>

                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    margin-top:20px;
                ">
                    <div style="text-align:right;">
                        <p style="font-size:12px; text-transform:uppercase; color:#64748B; font-weight:600; letter-spacing:0.5px;">
                            Starting From
                        </p>
                        <p style="font-size:26px; font-weight:700; color:#111;">₹${Math.min(...prices) || "0"}</p>
                    </div>

                    <div style="display:flex; gap:12px;">
                        <button onclick="switchToEditView('${p.id}')"
                            class="btn btn-outline">
                            Edit Details
                        </button>

                        <button class="btn btn-danger" style="background:#FEE2E2; color:#D62828; border:1px solid #FFB3B3;"
                            onclick="removeProperty('${p.id}')">
                            Remove
                        </button>
                    </div>
                </div>

            </div>
        `;

        listContainer.appendChild(card);

    });
}

window.handleAddProperty = async function (event) {
    event.preventDefault();

    const form = document.getElementById("propertyForm");
    const formData = new FormData(form);

    const token = localStorage.getItem("token");

    const res = await fetch("/api/addProperty", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: formData
    });

    const data = await res.json();

    if (!data.success) {
        showSuccessPopup("Error", "Failed to add property.");
        return;
    }

    switchToListView();
    bookingDetails();

    // ✅ CUSTOM SUCCESS POPUP
    showSuccessPopup("Property Added", "Your property has been added successfully.");
};

window.handleEditProperty = async function (event) {
    event.preventDefault();

    const form = document.getElementById("propertyFormEdit");
    const formData = new FormData(form);

    const propId = document.getElementById("propIdEdit").value;
    const token = localStorage.getItem("token");

    const res = await fetch(`/api/editProperty/${propId}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: formData
    });

    const data = await res.json();

    if (!data.success) {
        showSuccessPopup("Error", "Failed to update property.");
        return;
    }

    switchToListViewEdit();
    bookingDetails();

    // ✅ CUSTOM SUCCESS POPUP
    showSuccessPopup("Property Updated", "Your property has been updated successfully.");
};


let deletePropId = null;

async function removeProperty(propId) {
    // ✅ OPEN POPUP
    deletePropId = propId;
    document.getElementById("deleteModal").style.display = "flex";
}

// ✅ CANCEL BUTTON
document.getElementById("cancelDelete").addEventListener("click", () => {
    deletePropId = null;
    document.getElementById("deleteModal").style.display = "none";
});

// ✅ CONFIRM DELETE BUTTON
document.getElementById("confirmDelete").addEventListener("click", async () => {
    if (!deletePropId) return;

    const token = localStorage.getItem("token");
    const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
        console.log("Invalid or expired token.");
        localStorage.removeItem("token");
        return;
    }

    const data = await res.json();
    const userId = data.user?.id;

    const url = await fetch(`/api/removeProperty/${userId}/${deletePropId}`);
    const d = await url.json();

    if (d.success) {
        bookingDetails(); // ✅ Refresh list
    }

    // ✅ CLOSE POPUP
    deletePropId = null;
    document.getElementById("deleteModal").style.display = "none";
});

window.removeProperty = removeProperty;

async function loadPropertyForEdit(propID) {
    try {
        const token = localStorage.getItem("token");

        const res = await fetch(`/api/editProperty/${propID}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (!data.success || !data.property) {
            alert("Failed to load property");
            return;
        }

        const p = data.property;

        document.getElementById("propIdEdit").value = propID;
        document.getElementById("nameEdit").value = p.name;
        document.getElementById("locationEdit").value = p.city;
        document.getElementById("priceRangeEdit").value = p.price_per_night || "";
        document.getElementById("addressEdit").value = p.address;
        document.getElementById("descriptionEdit").value = p.description;
        document.getElementById("typeEdit").value = p.room_type || "";

    } catch (err) {
        console.error("Load Edit Error:", err);
        alert("Failed to load property");
    }
}

window.loadPropertyForEdit = loadPropertyForEdit;
