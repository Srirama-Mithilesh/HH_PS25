document.addEventListener('DOMContentLoaded', bookingDetails);
const table = document.getElementById("bookings-list");


async function bookingDetails(){
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

    const name = user?.user_metadata?.name || "No name";
    const email = user?.email || "No email";
    const userId = user?.id || "No userId"

    const response = await fetch(`/api/bookings/${userId}`);
    const d = await response.json();
    const property = d.hotels.length;

    d.bookings.forEach(booking => {
        const row = document.createElement("tr")

        const guest = document.createElement("td");
        guest.textContent = booking.id;
        row.appendChild(guest);

        const property = document.createElement("td");
        property.textContent = booking.name;
        row.appendChild(property);

        const check_in = document.createElement("td");
        check_in.textContent = booking.check_in;
        row.appendChild(check_in);

        const check_out = document.createElement("td");
        check_out.textContent = booking.check_out;
        row.appendChild(check_out);

        const Amount = document.createElement("td");
        Amount.textContent = booking.total_price;
        row.appendChild(Amount);

        const status = document.createElement("td");
        status.textContent = booking.status;
        row.appendChild(status);

        console.log(row);

        table.appendChild(row);
    });

}