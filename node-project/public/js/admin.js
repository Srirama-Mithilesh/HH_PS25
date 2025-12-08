document.addEventListener('DOMContentLoaded', bookingDetails);
const table = document.getElementById("recent-bookings-list");

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
    const userId = user?.id || "No userId";

    const response = await fetch(`/api/bookings/${userId}`);
    const d = await response.json();
    console.log(d);
    const property = d.hotels.length;

    let total_amount = 0;
    let total_active_bookings = 0;

    d.bookings.forEach(booking => {
        total_amount += booking.total_price;
        const currentDate = new Date();
        const check_in = new Date(booking.check_in);
        const check_out = new Date(booking.check_out)
        if(currentDate>check_in && currentDate<check_out)
        {
            total_active_bookings += 1;
        }
    });

    const overview = document.getElementById("stats-container");

    const revenue = document.createElement("div");
    revenue.className = "card";

    const total_revenue = document.createElement("div");
    total_revenue.className = "stat-title";
    total_revenue.textContent = `Total Revenue`;

    const total_revenue_value = document.createElement("div");
    total_revenue_value.className = "stat-value";
    total_revenue_value.textContent = total_amount;

    revenue.appendChild(total_revenue);
    revenue.appendChild(total_revenue_value);
    overview.appendChild(revenue);

    const active = document.createElement("div");
    active.className = "card";

    const active_bookings = document.createElement("div");
    active_bookings.className = "stat-title";
    active_bookings.textContent = `Active Bookings`;

    const active_bookings_value = document.createElement("div");
    active_bookings_value.className = "stat-value";
    active_bookings_value.textContent = total_active_bookings;
    
    active.appendChild(active_bookings);
    active.appendChild(active_bookings_value);
    overview.appendChild(active);

    const properties = document.createElement("div");
    properties.className = "card";

    const total_properties = document.createElement("div");
    total_properties.className = "stat-title";
    total_properties.textContent = `Total Properties`;

    const total_properties_value = document.createElement("div");
    total_properties_value.className = "stat-value";
    total_properties_value.textContent = property;
    
    properties.appendChild(total_properties);
    properties.appendChild(total_properties_value);
    overview.appendChild(properties);

    d.bookings.slice(0,3).forEach(booking => {
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

        table.appendChild(row);
    });

    

}