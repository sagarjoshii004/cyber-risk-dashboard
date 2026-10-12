
// frontend/js/auth.js

document.addEventListener("DOMContentLoaded", () => {
  const loginForm =
    document.getElementById("loginForm") ||
    document.querySelector("form");

  if (!loginForm) {
    console.error("Login form not found. Check login.html.");
    return;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const emailInput =
      loginForm.querySelector('[name="email"]') ||
      document.getElementById("email");

    const passwordInput =
      loginForm.querySelector('[name="password"]') ||
      document.getElementById("password");

    if (!emailInput || !passwordInput) {
      alert("Email or password field was not found.");
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      alert("Please enter your email and password.");
      return;
    }

    const submitButton = loginForm.querySelector(
      'button[type="submit"], input[type="submit"]'
    );

    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify({ email, password })
      });

      // Read as text first to avoid an unexpected JSON parsing error.
      const text = await response.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch {
        console.error("Server returned a non-JSON response:", text);
        throw new Error(
          "The server returned an unexpected response. Check the backend and login API route."
        );
      }

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      if (data.success === false) {
        throw new Error(data.message || "Invalid email or password.");
      }

      // Navigate only after the server accepts the login.
      window.location.href = "dashboard.html";
    } catch (error) {
      console.error("Login error:", error);
      alert(error.message || "Unable to connect to the server.");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
});
