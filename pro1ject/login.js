
const API_URL = "https://restaurantapi.stepacademy.ge/api/";
const STEP_KEY = "d0554fda-79b4-41ee-9fab-88290328049c";

const form = document.querySelector(".login-form");

if (localStorage.getItem("access_token")) {
  window.location.href = "index.html";
}

async function login(event) {
  event.preventDefault();

  const newUser = {
    email: document.querySelector("#email").value.trim(),
    password: document.querySelector("#password").value,
  };

  try {
const resp = await fetch(`${API_URL}auth/login`, {
  method: "POST",
  headers: {
    "X-STEP-KEY": STEP_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(newUser),
});

const data = await resp.json();

console.log("Status:", resp.status);
console.log("API response:", data);

if (!resp.ok) {
  throw new Error(
    data.message || JSON.stringify(data) || `HTTP Error: ${resp.status}`
  );
}

    const result = data.data;

    if (!result?.accessToken || !result?.refreshToken) {
      throw new Error("API-დან token-ები არ დაბრუნდა.");
    }

    localStorage.setItem("access_token", result.accessToken);
    localStorage.setItem("refresh_token", result.refreshToken);

    window.location.href = "index.html";
  } catch (error) {
    console.error("Login error:", error);
    alert(error.message || "ავტორიზაცია ვერ მოხერხდა.");
  }
}

form.addEventListener("submit", login);
