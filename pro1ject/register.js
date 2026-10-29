
const API_URL = "https://restaurantapi.stepacademy.ge/api/";
const STEP_KEY = "d0554fda-79b4-41ee-9fab-88290328049c";

const form = document.querySelector("form");

if (localStorage.getItem("access_token")) {
  window.location.href = "index.html";
}

async function register(event) {
  event.preventDefault();

  const newUser = {
    firstName: document.querySelector("#firstName").value.trim(),
    lastName: document.querySelector("#lastName").value.trim(),
    email: document.querySelector("#email").value.trim(),
    password: document.querySelector("#password").value,
  };

  try {
    const resp = await fetch(`${API_URL}auth/register`, {
      method: "POST",
      headers: {
        "X-STEP-KEY": STEP_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newUser),
    });

    const data = await resp.json();

    console.log("Register response:", data);

    if (!resp.ok) {
      throw new Error(data.detail || data.message || JSON.stringify(data));
    }

    alert("რეგისტრაცია წარმატებულია! ახლა გაიარე ავტორიზაცია.");
    window.location.href = "login.html";
  } catch (error) {
    console.error("Register error:", error);
    alert(error.message || "რეგისტრაცია ვერ მოხერხდა.");
  }
}

form.addEventListener("submit", register);
