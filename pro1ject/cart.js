const API_URL = "https://restaurantapi.stepacademy.ge/api/";
const API_KEY = "d0554fda-79b4-41ee-9fab-88290328049c";

const TAX_RATE = 0.10;
const LOGIN_PAGE = "login.html"; 
const TOKEN_KEYS = ["access_token", "accessToken", "token"];
const REFRESH_KEY = "refresh_token";

const REFRESH_ENDPOINT = "auth/refresh";

const CART_ENDPOINTS = {
  get: "cart",
  add: "cart/add-to-cart",
  update: "cart/edit-quantity",
  checkout: "cart/checkout",
};

const container = document.getElementById("cart-container");
const itemsCount = document.getElementById("items-count");
const subtotalElement = document.getElementById("subtotal");
const taxElement = document.getElementById("tax");
const totalElement = document.getElementById("total");
const checkoutButton = document.getElementById("checkout-btn");
const checkoutMessage = document.getElementById("checkout-message");

let cartItems = [];
let isLoading = false;

class AuthError extends Error {
  constructor(message = "სესია ამოიწურა. გთხოვ, თავიდან გაიარე ავტორიზაცია.") {
    super(message);
    this.name = "AuthError";
  }
}

function updateAuthUI() {
    const isLoggedIn = !!localStorage.getItem("access_token");

    document.querySelectorAll(".login").forEach(el => {
        el.style.display = isLoggedIn ? "none" : "";
    });

    document.querySelectorAll(".signup").forEach(el => {
        el.style.display = isLoggedIn ? "none" : "";
    });

    document.querySelectorAll("#profileBtn").forEach(el => {
        el.style.display = isLoggedIn ? "flex" : "none";
    });
}
document.addEventListener("DOMContentLoaded", updateAuthUI);

function getToken() {
  for (const key of TOKEN_KEYS) {
    const value = localStorage.getItem(key);
    if (value && value !== "undefined" && value !== "null") {
      return value.replace(/^"|"$/g, "");
    }
  }
  return null;
}

function isTokenExpired(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return payload.exp ? payload.exp * 1000 <= Date.now() : false;
  } catch {
    return false; 
  }
}

function formatPrice(price) {
  return `$${Number(price || 0).toFixed(2)}`;
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

let refreshPromise = null;

function extractToken(data) {
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

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) throw new AuthError();

    const response = await fetch(`${API_URL}${REFRESH_ENDPOINT}`, {
      method: "POST",
      headers: {
       "X-STEP-KEY": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      throw new AuthError();
    }

    const data = await response.json();
    const newAccess = extractToken(data);
    if (!newAccess) throw new AuthError();

    localStorage.setItem("access_token", newAccess);

    const newRefresh = extractRefreshToken(data);
    if (newRefresh) localStorage.setItem(REFRESH_KEY, newRefresh);

    return newAccess;
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
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    if (isRetry) throw new AuthError();
    await refreshAccessToken();
    return apiRequest(endpoint, options, true);
  }

  if (!response.ok) {
    let details = "";
    try {
      const clone = response.clone();
      try {
        const body = await clone.json();
        details = body?.message || body?.error || JSON.stringify(body);
      } catch {
        details = await clone.text();
      }
    } catch {
      details = `Status: ${response.status}`;
    }
    console.warn(`API Warning on ${endpoint}:`, { status: response.status, details });
    throw new Error(`API შეცდომა: ${response.status}${details ? ` - ${details}` : ""}`);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function normalizeCart(data) {
  const possibleItems =
    data?.data?.items ??
    data?.data?.cart ??
    data?.data?.products ??
    data?.items ??
    data?.cart ??
    data?.products ??
    [];

  if (!Array.isArray(possibleItems)) {
    throw new Error("კალათის მონაცემების ფორმა ვერ განისაზღვრა.");
  }

  return possibleItems.map((entry) => {
    const product = entry.product ?? entry.productDetails ?? entry;
    const quantity = Number(entry.quantity ?? entry.count ?? 1);

    return {
      id: product.id ?? entry.productId ?? entry.product_id,
      cartItemId: entry.id ?? entry.cart_item_id ?? entry.cartItemId ?? null,
      name: product.name ?? "Unnamed product",
      description: product.description ?? "",
      image: product.image ?? product.imageUrl ?? "",
      price: Number(product.price ?? entry.price ?? 0),
      quantity: Math.max(1, Number.isFinite(quantity) ? quantity : 1),
    };
  });
}

function renderAuthRequired(message) {
  container.innerHTML = `
    <div class="empty-cart">
      <h2>ავტორიზაცია საჭიროა</h2>
      <p>${escapeHTML(message)}</p>
      <a class="continue-shopping" href="${LOGIN_PAGE}">შესვლა</a>
    </div>
  `;
  cartItems = [];
  updateSummary();
}

async function loadCart() {
  if (isLoading) return;

  if (!getToken() && !localStorage.getItem(REFRESH_KEY)) {
    renderAuthRequired("კალათის სანახავად გთხოვ, გაიარე ავტორიზაცია.");
    return;
  }

  isLoading = true;
  container.innerHTML = `<p class="cart-message">კალათის ჩატვირთვა...</p>`;

  try {
    const data = await apiRequest(CART_ENDPOINTS.get);
    cartItems = normalizeCart(data);
    renderCart();
  } catch (error) {
    console.error("Cart loading error:", error);

    if (error instanceof AuthError) {
      renderAuthRequired(error.message);
      return;
    }

    container.innerHTML = `
      <div class="empty-cart">
        <h2>კალათის ჩატვირთვა ვერ მოხერხდა</h2>
        <p>${escapeHTML(error.message)}</p>
        <button class="checkout-btn" onclick="loadCart()">
          ხელახლა ცდა
        </button>
      </div>
    `;
  } finally {
    isLoading = false;
  }
}

function renderCart() {
  if (cartItems.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <h2>კალათა ცარიელია</h2>
        <p>დაამატე პროდუქტები მენიუდან.</p>
        <a class="continue-shopping" href="index.html">
          დაბრუნება მენიუში
        </a>
      </div>
    `;
    updateSummary();
    return;
  }

  container.innerHTML = cartItems
    .map((item) => {
      const safeName = escapeHTML(item.name);
      const safeDescription = escapeHTML(item.description);
      const safeImage = escapeHTML(item.image);
      const safeId = escapeHTML(item.id);
      const lineTotal = item.price * item.quantity;

      return `
        <article class="cart-item" data-id="${safeId}">
          <img
            class="cart-item-image"
            src="${safeImage}"
            alt="${safeName}"
          >

          <div class="cart-item-info">
            <h3>${safeName}</h3>
            <p>${safeDescription}</p>

            <div class="quantity-control">
              <button
                type="button"
                data-action="decrease"
                data-id="${safeId}"
                aria-label="რაოდენობის შემცირება"
                ${item.quantity <= 1 ? "disabled" : ""}
              >−</button>

              <span>${item.quantity}</span>

              <button
                type="button"
                data-action="increase"
                data-id="${safeId}"
                aria-label="რაოდენობის გაზრდა"
              >+</button>
            </div>
          </div>

          <div class="cart-item-price">
            <span class="each-price">${formatPrice(item.price)} each</span>
            <span class="line-total">${formatPrice(lineTotal)}</span>
          </div>

          <button
            type="button"
            class="remove-btn"
            data-action="remove"
            data-id="${safeId}"
            aria-label="პროდუქტის წაშლა"
            title="Remove item"
          >&#128465;</button>
        </article>
      `;
    })
    .join("");

  updateSummary();
}

function updateSummary() {
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  const count = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  itemsCount.textContent = `${count} ${count === 1 ? "item" : "items"}`;
  subtotalElement.textContent = formatPrice(subtotal);
  taxElement.textContent = formatPrice(tax);
  totalElement.textContent = formatPrice(total);

  checkoutButton.disabled = cartItems.length === 0;
}

container.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;
  const item = cartItems.find((product) => String(product.id) === String(id));

  if (!item) return;

  if (action === "increase") {
    await updateQuantity(item, item.quantity + 1);
  }

  if (action === "decrease" && item.quantity > 1) {
    await updateQuantity(item, item.quantity - 1);
  }

  if (action === "remove") {
    await removeItem(item);
  }
});

async function updateQuantity(item, newQuantity) {
  const previousQuantity = item.quantity;
  item.quantity = newQuantity;
  renderCart();

  try {
    await apiRequest(CART_ENDPOINTS.update, {
      method: "PUT",
      body: JSON.stringify({ 
        productId: item.id, 
        product_id: item.id,
        id: item.cartItemId || item.id,
        quantity: newQuantity,
        count: newQuantity
      }),
    });
  } catch (error) {
    console.error("Quantity update error:", error);
    item.quantity = previousQuantity;
    renderCart();
    if (error instanceof AuthError) {
      renderAuthRequired(error.message);
      return;
    }
    alert("რაოდენობის შეცვლა ვერ მოხერხდა.");
  }
}

async function removeItem(item) {
  const confirmed = confirm(`წავშალოთ "${item.name}" კალათიდან?`);
  if (!confirmed) return;

  
  const previousItems = [...cartItems];
  cartItems = cartItems.filter((p) => String(p.id) !== String(item.id));
  renderCart();

  try {
    await apiRequest(CART_ENDPOINTS.update, {
      method: "PUT",
      body: JSON.stringify({ 
        productId: item.id, 
        product_id: item.id,
        id: item.cartItemId || item.id,
        quantity: 0,
        count: 0 
      }),
    });
  } catch (error) {
    console.error("Remove item error:", error);
    cartItems = previousItems;
    renderCart();
    if (error instanceof AuthError) {
      renderAuthRequired(error.message);
      return;
    }
    alert("პროდუქტის წაშლა ვერ მოხერხდა.");
  }
}

checkoutButton.addEventListener("click", async () => {
  if (cartItems.length === 0 || checkoutButton.disabled) return;

  checkoutButton.disabled = true;
  if (checkoutMessage) {
    checkoutMessage.textContent = "მიმდინარეობს შეკვეთის გაფორმება...";
  }

  try {
    await apiRequest(CART_ENDPOINTS.checkout, { method: "POST" });
    if (checkoutMessage) {
      checkoutMessage.textContent = "შეკვეთა წარმატებით გაფორმდა!";
    }
    await loadCart();
  } catch (error) {
    console.error("Checkout error:", error);
    if (checkoutMessage) {
      checkoutMessage.textContent =
        error instanceof AuthError
          ? error.message
          : "შეკვეთის გაფორმება ვერ მოხერხდა.";
    }
    checkoutButton.disabled = cartItems.length === 0;
  }
});

document.addEventListener("DOMContentLoaded", loadCart);