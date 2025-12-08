//public/js.client.js

// Redirect if not logged in
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/login.html";
        return;
    }
});



function switchView(viewName) {
    // Hide all sections
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(section => {
        section.classList.remove('active');
        // Small delay to reset split layout display logic if needed
        setTimeout(() => {
            if (!section.classList.contains('active')) {
                // optional cleanup
            }
        }, 300);
    });

    // Determine ID based on view name
    let sectionId = '';
    if (viewName === 'landing') sectionId = 'landing-section';
    else if (viewName === 'casual') sectionId = 'casual-section';
    else if (viewName === 'professional') sectionId = 'professional-section';
    else if (viewName === 'success') sectionId = 'success-section';

    // Show target section
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add('active');
        window.scrollTo(0, 0);
    }
}

async function handleSubmit(event, type) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const fileInput = form.querySelector('input[name="photos"]');
    if (fileInput && fileInput.files.length > 0) {
        for (let file of fileInput.files) {
            formData.append("photos", file);
        }
    }
    // console.log("DEBUG - guests value:", formData.get("guests"));
    // console.log("FORM DATA:", [...formData.entries()]);

    const token = localStorage.getItem("token");

    const url =
        type === "casual"
            ? "/api/listings/casual"
            : "/api/listings/professional";

    const res = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: formData
    });

    const data = await res.json();

    if (!data.success) {
        alert("Error uploading listing");
        return;
    }

    switchView("success");
}



// Initial state check (optional)
document.addEventListener('DOMContentLoaded', () => {
    // Ensure landing is active on load
    document.getElementById('landing-section').classList.add('active');
    // FILE UPLOAD PREVIEW HANDLER
    // FILE UPLOAD PREVIEW HANDLER FIXED (NO DOUBLE CLICK)
    document.querySelectorAll('.file-upload').forEach(uploadBox => {
        const fileInput = uploadBox.querySelector('input[type="file"]');

        // Prevent attaching listeners twice
        if (uploadBox.dataset.fixed === "1") return;
        uploadBox.dataset.fixed = "1";

        // No need to manually trigger click() anymore
        // The input is already clickable due to CSS overlay

        // Handle preview rendering
        fileInput.addEventListener('change', () => {
            if (!fileInput.files.length) return;

            // Remove old previews
            uploadBox.querySelectorAll(".preview-thumb").forEach(el => el.remove());

            [...fileInput.files].forEach(file => {
                const preview = document.createElement("div");
                preview.className = "preview-thumb";

                if (file.type.startsWith("image/")) {
                    const img = document.createElement("img");
                    img.src = URL.createObjectURL(file);
                    img.onload = () => URL.revokeObjectURL(img.src);
                    preview.appendChild(img);
                }

                uploadBox.appendChild(preview);
            });
        });
    });
});
