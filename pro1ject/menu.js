"use strict";

const API_URL = "https://restaurantapi.stepacademy.ge/api/";
const API_KEY = "d0554fda-79b4-41ee-9fab-88290328049c";

let container;
let navbar;
let allProducts = [];

function initMenuPage() {
  container = document.getElementById("menu-container");
  navbar = document.querySelector(".navbar");

  if (!container) {
    console.error('Missing element: #menu-container');
    return;
  }

  setupFilters();
  updateAuthUI();
  getData();

  window.addEventListener("scroll", () => {
    navbar?.classList.toggle("scrolled", window.scrollY > 10);
  }, { passive: true });

  window.addEventListener("storage", updateAuthUI);
}


if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMenuPage);
} else {
  initMenuPage();
}



function updateAuthUI() {
  const isLoggedIn = Boolean(localStorage.getItem("access_token"));

  document.querySelectorAll(".login, #loginBtn").forEach((el) => {
    el.style.display = isLoggedIn ? "none" : "";
  });

  document.querySelectorAll(".signup, #signupBtn").forEach((el) => {
    el.style.display = isLoggedIn ? "none" : "";
  });

  document.querySelectorAll("#profileBtn").forEach((el) => {
    el.style.display = isLoggedIn ? "flex" : "none";
  });
}



function setupFilters() {
  if (document.getElementById("menu-filters")) return;

  const filters = document.createElement("section");
  filters.id = "menu-filters";
  filters.className = "menu-filters";
  filters.setAttribute("aria-label", "Filter menu products");

  filters.innerHTML = `
    <div class="filter-field">
      <label for="product-search">Search by name</label>
      <input
        id="product-search"
        type="search"
        placeholder="Search dishes..."
        autocomplete="off"
      >
    </div>

    <div class="filter-field">
      <label for="min-price">Minimum price</label>
      <input
        id="min-price"
        type="number"
        min="0"
        step="0.01"
        placeholder="From"
      >
    </div>

    <div class="filter-field">
      <label for="max-price">Maximum price</label>
      <input
        id="max-price"
        type="number"
        min="0"
        step="0.01"
        placeholder="To"
      >
    </div>

    <div class="filter-field">
      <label for="sort-products">Sort products</label>
      <select id="sort-products">
        <option value="default">Default order</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
        <option value="name-asc">Name: A–Z</option>
      </select>
    </div>

    <button id="reset-filters" type="button">
      Reset filters
    </button>

    <p id="filter-status" role="status" aria-live="polite"></p>
  `;

  container.parentNode.insertBefore(filters, container);

  filters.querySelector("#product-search")
    .addEventListener("input", applyFilters);

  filters.querySelector("#min-price")
    .addEventListener("input", applyFilters);

  filters.querySelector("#max-price")
    .addEventListener("input", applyFilters);

  filters.querySelector("#sort-products")
    .addEventListener("change", applyFilters);

  filters.querySelector("#reset-filters")
    .addEventListener("click", resetFilters);
}



async function getData() {
  container.setAttribute("aria-busy", "true");
  container.textContent = "Loading products...";

  try {
    const response = await fetch(`${API_URL}products`, {
      method: "GET",
      headers: {
        "X-STEP-KEY": API_KEY,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    const products = data?.data?.products;

    if (!Array.isArray(products)) {
      throw new Error("Products were not found in the API response.");
    }


    allProducts = products.map((product, index) => ({
      ...product,
      _originalIndex: index
    }));

    applyFilters();
  } catch (error) {
    console.error("Error fetching products:", error);
    container.textContent = "პროდუქტების ჩატვირთვა ვერ მოხერხდა.";
  } finally {
    container.removeAttribute("aria-busy");
  }
}



function getInputPrice(id) {
  const input = document.getElementById(id);

  if (!input || input.value.trim() === "") {
    return null;
  }

  const value = Number(input.value);

  return Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function getProductPrice(product) {
  if (
    product.price === null ||
    product.price === undefined ||
    product.price === ""
  ) {
    return null;
  }

  const value = Number(product.price);

  return Number.isFinite(value) ? value : null;
}

function applyFilters() {
  if (!container) return;

  const searchInput = document.getElementById("product-search");
  const sortInput = document.getElementById("sort-products");
  const status = document.getElementById("filter-status");

  if (!searchInput || !sortInput || !status) return;

  const searchTerm = searchInput.value.trim().toLocaleLowerCase();
  const minPrice = getInputPrice("min-price");
  const maxPrice = getInputPrice("max-price");
  const sortOrder = sortInput.value;

  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    status.textContent = "Minimum price cannot exceed maximum price.";
    container.replaceChildren();
    return;
  }

  let filteredProducts = allProducts.filter((product) => {
    const name = String(product.name ?? "").toLocaleLowerCase();
    const price = getProductPrice(product);

    const matchesName = name.includes(searchTerm);

    const matchesMin =
      minPrice === null ||
      (price !== null && price >= minPrice);

    const matchesMax =
      maxPrice === null ||
      (price !== null && price <= maxPrice);

    return matchesName && matchesMin && matchesMax;
  });

  filteredProducts.sort((a, b) => {
    const priceA = getProductPrice(a);
    const priceB = getProductPrice(b);

    if (sortOrder === "price-asc") {
      if (priceA === null) return 1;
      if (priceB === null) return -1;
      return priceA - priceB;
    }

    if (sortOrder === "price-desc") {
      if (priceA === null) return 1;
      if (priceB === null) return -1;
      return priceB - priceA;
    }

    if (sortOrder === "name-asc") {
      return String(a.name ?? "").localeCompare(
        String(b.name ?? ""),
        undefined,
        { sensitivity: "base" }
      );
    }

    return a._originalIndex - b._originalIndex;
  });

  render(filteredProducts);

  status.textContent = filteredProducts.length === 0
    ? "პროდუქტები ვერ მოიძებნა."
    : `ნაპოვნია ${filteredProducts.length} პროდუქტი`;
}

function resetFilters() {
  document.getElementById("product-search").value = "";
  document.getElementById("min-price").value = "";
  document.getElementById("max-price").value = "";
  document.getElementById("sort-products").value = "default";

  applyFilters();
}



function render(products) {
  container.replaceChildren();

  if (products.length === 0) {
    const message = document.createElement("p");
    message.className = "no-products";
    message.textContent = "ამ ფილტრებით პროდუქტი ვერ მოიძებნა.";
    container.appendChild(message);
    return;
  }

  const fragment = document.createDocumentFragment();

  products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "menu-item";
    card.id = `item-${product.id}`;

    const detailsLink = document.createElement("a");
    detailsLink.className = "menu-item-details";
    detailsLink.href = `details.html?id=${encodeURIComponent(product.id)}`;
    detailsLink.setAttribute("aria-label", `${product.name} — details`);

    const image = document.createElement("img");
    image.src = String(product.image ?? "");
    image.alt = String(product.name ?? "Food product");
    image.loading = "lazy";

    image.addEventListener("error", () => {
      image.style.display = "none";
    }, { once: true });

    const name = document.createElement("h3");
    name.className = "menu-product-name";
    name.textContent = String(product.name ?? "Unnamed product");

    const description = document.createElement("p");
    description.className = "menu-product-description";
    description.textContent = String(product.description ?? "");

    const price = document.createElement("p");
    price.className = "menu-price";

    const numericPrice = getProductPrice(product);
    price.textContent = numericPrice === null
      ? "Price unavailable"
      : `$${numericPrice.toFixed(2)}`;

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.textContent = "Add to cart";
    addButton.addEventListener("click", (event) => {
      event.stopPropagation();
      addToCart(product.id);
    });

    detailsLink.append(image, name, description, price);
    card.append(detailsLink, addButton);
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}



function newEntry(id) {
  window.location.href =
    `details.html?id=${encodeURIComponent(id)}`;
}



async function addToCart(id) {
  try {
    const token = localStorage.getItem("access_token");

    if (!token) {
      alert("გთხოვ, ჯერ გაიარე ავტორიზაცია!");
      return;
    }

    const response = await fetch(`${API_URL}cart/add-to-cart`, {
      method: "POST",
      headers: {
        "X-STEP-KEY": API_KEY,
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        productId: id,
        quantity: 1
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    alert("პროდუქტი კალათაში დაემატა!");
  } catch (error) {
    console.error("Error adding product to cart:", error);
    alert("კალათაში დამატება ვერ მოხერხდა. სცადე თავიდან.");
  }
}