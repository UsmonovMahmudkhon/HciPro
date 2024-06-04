document.addEventListener("DOMContentLoaded", function() {
    const form = document.querySelector("#register-form");
    form.addEventListener("submit", function(event) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);

        const user = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            re_password: formData.get('re_password')
        }

        if(user.password != user.re_password) {
            alert("Password is incorrect!");
        } else {
            localStorage.setItem(user.email, JSON.stringify(user));
            alert("User registered successfully!");
            window.location.href = "login.html";
            form.reset();
        }
    });
});

