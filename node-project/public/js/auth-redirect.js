function redirectToLogin() {
  const current = window.location.href;
  window.location.href = `/login.html?redirect=${encodeURIComponent(current)}`;
}

// function handleBookingClick() {
//   const token = localStorage.getItem("token");

//   if (!token) {
//     // user NOT logged in → go to login with redirect
//     redirectToLogin();
//   } else {
//     // user logged in → stay here or go to booking flow
//     alert("Proceed to booking flow here.");
//   }
// }
