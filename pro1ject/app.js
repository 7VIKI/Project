
const API_URL = "https://restaurantapi.stepacademy.ge/api/";
const API_KEY = "d0554fda-79b4-41ee-9fab-88290328049c";

const TOKEN_KEYS = ["access_token", "accessToken", "token"];
const REFRESH_KEY = "refresh_token";
const REFRESH_ENDPOINT = "auth/refresh";
const ADD_TO_CART_ENDPOINT = "cart/add-to-cart";

const navbar = document.querySelector(".navbar");
const container = document.getElementById("menu-container");


const pendingProducts = new Set();



window.addEventListener(
  "scroll",
  () => {
    navbar?.classList.toggle("scrolled", window.scrollY > 10);
  },
  { passive: true }
);


function updateAuthUI() {
  const isLoggedIn = Boolean(getToken());

  document.querySelectorAll(".login, .signup").forEach((element) => {
    element.style.display = isLoggedIn ? "none" : "";
  });

  document.querySelectorAll("#profileBtn").forEach((element) => {
    element.style.display = isLoggedIn ? "flex" : "none";
  });
}

document.addEventListener("DOMContentLoaded", updateAuthUI);



class AuthError extends Error {
  constructor(message = "სესია ამოიწურა. გაიარე ავტორიზაცია თავიდან.") {
    super(message);
    this.name = "AuthError";
  }
}

function getToken() {
  for (const key of TOKEN_KEYS) {
    const token = localStorage.getItem(key);

    if (token && token !== "undefined" && token !== "null") {
      return token.replace(/^"|"$/g, "");
    }
  }

  return null;
}

function isTokenExpired(token) {
  try {
    const parts = token.split(".");
    if (!parts[1]) return false;

    const base64 = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const payload = JSON.parse(atob(base64));

    return payload.exp
      ? payload.exp * 1000 <= Date.now()
      : false;
  } catch {
    return false;
  }
}

function extractAccessToken(data) {
  return (
    data?.access_token ??
    data?.accessToken ??
    data?.token ??
    data?.data?.access_token ??
    data?.data?.accessToken ??
    data?.data?.token ??
    null
  );
}

function extractRefreshToken(data) {
  return (
    data?.refresh_token ??
    data?.refreshToken ??
    data?.data?.refresh_token ??
    data?.data?.refreshToken ??
    null
  );
}

let refreshPromise = null;

async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);

    if (!refreshToken) {
      throw new AuthError();
    }

    const response = await fetch(
      `${API_URL}${REFRESH_ENDPOINT}`,
      {
        method: "POST",
        headers: {
          "X-STEP-KEY": API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      }
    );

    if (!response.ok) {
      throw new AuthError();
    }

    const data = await response.json();
    const newAccessToken = extractAccessToken(data);

    if (!newAccessToken) {
      throw new AuthError();
    }

    localStorage.setItem("access_token", newAccessToken);

    const newRefreshToken = extractRefreshToken(data);

    if (newRefreshToken) {
      localStorage.setItem("refresh_token", newRefreshToken);
    }

    updateAuthUI();

    return newAccessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}



async function apiRequest(endpoint, options = {}, isRetry = false) {
  let token = getToken();

  if (!token || isTokenExpired(token)) {
    token = await refreshAccessToken();
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "X-STEP-KEY": API_KEY,
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    if (isRetry) {
      throw new AuthError();
    }

    await refreshAccessToken();

    return apiRequest(endpoint, options, true);
  }

  const responseText = await response.text();

  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText };
    }
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      `HTTP ${response.status}`;

    throw new Error(message);
  }

  return data;
}



async function getData() {
  if (!container) {
    console.error("menu-container ვერ მოიძებნა HTML-ში.");
    return;
  }

  try {
    container.innerHTML = "<p>პროდუქტები იტვირთება...</p>";

    const response = await fetch(`${API_URL}products`, {
      method: "GET",
      headers: {
        "X-STEP-KEY": API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const products = data?.data?.products;

    if (!Array.isArray(products)) {
      throw new Error("პროდუქტების მონაცემები ვერ მოიძებნა.");
    }

    render(products.slice(0, 6));
  } catch (error) {
    console.error("Products loading error:", error);

    container.innerHTML =
      "<p>პროდუქტების ჩატვირთვა ვერ მოხერხდა.</p>";
  }
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });
}

function render(products) {
  if (!container) return;

  container.innerHTML = products
    .map((item) => {
      const id = Number(item.id);

      if (!Number.isFinite(id)) return "";

      const name = escapeHTML(item.name ?? "");
      const description = escapeHTML(item.description ?? "");
      const image = escapeHTML(item.image ?? "");
      const rating = Number(item.rating ?? 10);
      const price = Number(item.price ?? 0);

      return `
        <article
          class="menu-item"
          id="item-${id}"
          data-product-id="${id}"
        >
          <img src="${image}" alt="${name}">

          <h3>${name}</h3>

          <p>${description}</p>

          <small>⭐ ${Number.isFinite(rating) ? rating : 10}</small>

          <p class="menu-price">$${price.toFixed(2)}</p>

          <button
            type="button"
            class="add-to-cart-btn"
            data-product-id="${id}"
          >
            Add to cart
          </button>
        </article>
      `;
    })
    .join("");
}


if (container) {
  container.addEventListener("click", (event) => {
    const button = event.target.closest(".add-to-cart-btn");

    if (button) {
      event.stopPropagation();
      addToCart(Number(button.dataset.productId), button);
      return;
    }

    const item = event.target.closest(".menu-item");

    if (item) {
      newEntry(Number(item.dataset.productId));
    }
  });
}

function newEntry(id) {
  if (!Number.isFinite(id)) return;

  window.location.href = `cart.html?id=${encodeURIComponent(id)}`;
}

async function addToCart(id, button = null) {
  if (!Number.isFinite(id) || id <= 0) {
    alert("პროდუქტის ID არასწორია.");
    return;
  }

  if (pendingProducts.has(id)) {
    return;
  }

  if (!getToken() && !localStorage.getItem(REFRESH_KEY)) {
    alert("გთხოვ, ჯერ გაიარე ავტორიზაცია!");
    window.location.href = "login.html";
    return;
  }

  pendingProducts.add(id);

  const originalText = button?.textContent;

  if (button) {
    button.disabled = true;
    button.textContent = "ემატება...";
  }

  try {
    const response = await apiRequest(ADD_TO_CART_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({
        productId: id,
        quantity: 1,
      }),
    });

    console.log("Add to cart response:", response);

    if (button) {
      button.textContent = "დამატებულია ✓";
    }

   
  } catch (error) {
    console.error("Add to cart error:", error);

    if (error instanceof AuthError) {
      alert("სესია ამოიწურა. გთხოვ, თავიდან გაიარე ავტორიზაცია.");
      window.location.href = "login.html";
      return;
    }

   
  } finally {
    pendingProducts.delete(id);

    if (button) {
      button.disabled = false;

      if (button.textContent === "ემატება...") {
        button.textContent = originalText || "Add to cart";
      }
    }
  }
}



getData();
const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

if (menuToggle && navMenu) {
    menuToggle.addEventListener("click", () => {
        const isOpen = navMenu.classList.toggle("open");

        menuToggle.setAttribute("aria-expanded", isOpen);
        menuToggle.setAttribute(
            "aria-label",
            isOpen ? "Close navigation menu" : "Open navigation menu"
        );
    });

    navMenu.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            navMenu.classList.remove("open");
            menuToggle.setAttribute("aria-expanded", "false");
        });
    });
}

