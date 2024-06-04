document.addEventListener("DOMContentLoaded", function() {
    const form = document.querySelector("#login-form");
    form.addEventListener("submit", function(event) {
        event.preventDefault();

        const email = form.querySelector("input[type='email']").value;
        const password = form.querySelector("input[type='password']").value;

        const user = JSON.parse(localStorage.getItem(email));

        if (user && user.password === password) {
            alert("Login successful!");
            // 로그인 성공 후의 동작을 여기에 추가 (예: 리디렉션)
            document.location.href = "index.html"
        } else {
            alert("Invalid email or password");
        }
    });
});
