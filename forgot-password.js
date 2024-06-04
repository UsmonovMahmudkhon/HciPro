document.addEventListener("DOMContentLoaded", function() {
    const form = document.querySelector("#forgot-password-form");
    form.addEventListener("submit", function(event) {
        event.preventDefault();

        const email = form.querySelector("input[name='email']").value;
        const user = JSON.parse(localStorage.getItem(email));

        if (user) {
            alert(`Your password is: ${user.password}`);
        } else {
            alert("No user found with this email.");
        }
    });
});
