
  
const API_URL = "https://restaurantapi.stepacademy.ge/api/";
const API_KEY = "d0554fda-79b4-41ee-9fab-88290328049c";

const MAX_RELATED_PRODUCTS = 3;
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 99;

const elements = {
  details: document.getElementById("product-details"),
  related: document.getElementById("related-products"),
  toast: document.getElementById("toast"),
};

const state = {
  products: [],
  currentProduct: null,
  quantity: MIN_QUANTITY,
  addingProducts: new Set(),
  toastTimeout: null,
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const formatPrice = (price) =>
  moneyFormatter.format(Number(price) || 0);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
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

function safeImageURL(value) {
  const url = String(value ?? "").trim();

  if (
    url.startsWith("https://") ||
    url.startsWith("http://") ||
    url.startsWith("/")
  ) {
    return escapeHTML(url);
  }

  return "";
}

function getProductId(product) {
  return String(product?.id ?? "");
}

function getIngredients(product) {
  const ingredients =
    product.ingredients ??
    product.ingredient ??
    product.components;

  if (Array.isArray(ingredients)) {
    return ingredients
      .map((item) => {
        if (typeof item === "string") return item;
        return item?.name ?? "";
      })
      .filter(Boolean);
  }

  if (typeof ingredients === "string") {
    return ingredients
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getPreparation(product) {
  return (
    product.preparationMethod ??
    product.preparation_method ??
    product.preparation ??
    ""
  );
}

function getRating(product) {
  const rating = Number(
    product.rating ?? product.averageRating
  );

  return Number.isFinite(rating) && rating > 0 && rating <= 5
    ? rating
    : null;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");

  clearTimeout(state.toastTimeout);

  state.toastTimeout = setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2800);
}

async function fetchProducts() {
  const response = await fetch(`${API_URL}products`, {
    method: "GET",
    headers: {
      "X-STEP-KEY": API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`პროდუქტების API შეცდომა: ${response.status}`);
  }

  const result = await response.json();


  const products = result?.data?.products;

  if (!Array.isArray(products)) {
    throw new Error("API-დან პროდუქტების სია ვერ მივიღეთ.");
  }

  return products;
}

function renderRating(product, compact = false) {
  const rating = getRating(product);

  if (rating === null) {
    return "";
  }

  const rounded = Math.round(rating);
  const stars = "★".repeat(rounded) + "☆".repeat(5 - rounded);

  if (compact) {
    return `
      <div class="card-rating" aria-label="რეიტინგი ${rating} ხუთიდან">
        ${stars} ${rating.toFixed(1)}
      </div>
    `;
  }

  return `
    <div class="product-rating">
      <span class="rating-stars" aria-hidden="true">${stars}</span>
      <span class="rating-value">(${rating.toFixed(1)} rating)</span>
    </div>
  `;
}

function renderIngredients(product) {
  const ingredients = getIngredients(product);

  if (!ingredients.length) {
    return "";
  }

  return `
    <div class="ingredients-section">
      <h3 class="details-heading">Ingredients:</h3>

      <ul class="ingredients-list">
        ${ingredients
          .map((ingredient) => `<li>${escapeHTML(ingredient)}</li>`)
          .join("")}
      </ul>
    </div>
  `;
}

function renderPreparation(product) {
  const preparation = getPreparation(product);

  if (!preparation) {
    return "";
  }

  return `
    <div class="preparation-section">
      <h3 class="details-heading">Preparation Method:</h3>
      <p class="preparation-text">${escapeHTML(preparation)}</p>
    </div>
  `;
}

function renderMainProduct(product) {
  const image = safeImageURL(product.image);
  const name = escapeHTML(product.name || "Product");
  const description = escapeHTML(
    product.description || "აღწერა მიუწვდომელია."
  );

  elements.details.innerHTML = `
    <div class="product-gallery">
      ${
        image
          ? `<img
              class="product-main-image"
              src="${image}"
              alt="${name}"
              fetchpriority="high"
            >`
          : `<div class="empty-state">ფოტო მიუწვდომელია</div>`
      }
    </div>

    <div class="product-info">
      <h1 class="product-title">${name}</h1>

      ${renderRating(product)}

      <p class="product-price" id="main-price">
        ${formatPrice(product.price)}
      </p>

      <p class="product-description">${description}</p>

      ${renderIngredients(product)}
      ${renderPreparation(product)}

      <div class="purchase-controls">
        <div class="quantity-control" aria-label="პროდუქტის რაოდენობა">
          <button
            class="quantity-btn"
            type="button"
            data-action="decrease"
            aria-label="რაოდენობის შემცირება"
          >−</button>

          <span
            class="quantity-value"
            id="quantity-value"
            aria-live="polite"
          >${state.quantity}</span>

          <button
            class="quantity-btn"
            type="button"
            data-action="increase"
            aria-label="რაოდენობის გაზრდა"
          >+</button>
        </div>

        <div class="purchase-total">
          ჯამი:
          <strong id="purchase-total">
            ${formatPrice(Number(product.price) * state.quantity)}
          </strong>
        </div>
      </div>

      <button
        class="add-to-cart"
        type="button"
        data-action="add-main"
        data-product-id="${escapeHTML(getProductId(product))}"
      >
        Add to Cart
      </button>
    </div>
  `;
}

function renderRelatedProducts() {
  const currentId = getProductId(state.currentProduct);

  const relatedProducts = state.products
    .filter((product) => getProductId(product) !== currentId)
    .slice(0, MAX_RELATED_PRODUCTS);

  if (!relatedProducts.length) {
    elements.related.innerHTML = `
      <p class="empty-state">მსგავსი პროდუქტები ვერ მოიძებნა.</p>
    `;
    return;
  }

  elements.related.innerHTML = relatedProducts
    .map((product) => {
      const id = escapeHTML(getProductId(product));
      const name = escapeHTML(product.name || "Product");
      const description = escapeHTML(
        product.description || "აღწერა მიუწვდომელია."
      );
      const image = safeImageURL(product.image);

      return `
        <article class="product-card">
          <a
            class="card-image-link"
            href="details.html?id=${encodeURIComponent(getProductId(product))}"
            aria-label="${name} - დეტალები"
          >
            ${
              image
                ? `<img
                    class="card-image"
                    src="${image}"
                    alt="${name}"
                    loading="lazy"
                  >`
                : `<div class="empty-state">ფოტო მიუწვდომელია</div>`
            }
          </a>

          <div class="card-content">
            <h3 class="card-title">
              <a
                class="card-title-link"
                href="details.html?id=${encodeURIComponent(getProductId(product))}"
              >${name}</a>
            </h3>

            <p class="card-description">${description}</p>

            ${renderRating(product, true)}

            <p class="card-price">${formatPrice(product.price)}</p>

            <button
              class="add-to-cart card-add-btn"
              type="button"
              data-action="add-related"
              data-product-id="${id}"
            >
              Add to Cart
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function updateQuantity(nextQuantity) {
  state.quantity = Math.max(
    MIN_QUANTITY,
    Math.min(MAX_QUANTITY, nextQuantity)
  );

  const quantityElement = document.getElementById("quantity-value");
  const totalElement = document.getElementById("purchase-total");
  const decreaseButton = elements.details.querySelector(
    '[data-action="decrease"]'
  );
  const increaseButton = elements.details.querySelector(
    '[data-action="increase"]'
  );

  if (quantityElement) {
    quantityElement.textContent = state.quantity;
  }

  if (totalElement && state.currentProduct) {
    totalElement.textContent = formatPrice(
      Number(state.currentProduct.price) * state.quantity
    );
  }

  if (decreaseButton) {
    decreaseButton.disabled = state.quantity <= MIN_QUANTITY;
  }

  if (increaseButton) {
    increaseButton.disabled = state.quantity >= MAX_QUANTITY;
  }
}

async function addToCart(productId, quantity = 1) {
  const token = localStorage.getItem("access_token");

  if (!token) {
    showToast("გთხოვ, ჯერ გაიარე ავტორიზაცია!");
    return;
  }

  if (state.addingProducts.has(String(productId))) {
    return;
  }

  const button = document.querySelector(
    `button[data-product-id="${CSS.escape(String(productId))}"]`
  );

  state.addingProducts.add(String(productId));

  if (button) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = "Adding...";
  }

  try {
    const response = await fetch(`${API_URL}cart/add-to-cart`, {
      method: "POST",
      headers: {
        "X-STEP-KEY": API_KEY,
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        productId: Number(productId),
        quantity,
      }),
    });

    if (response.status === 401 || response.status === 403) {
      showToast("სესია დასრულდა. გაიარე ავტორიზაცია თავიდან.");
      return;
    }

    if (!response.ok) {
      throw new Error(`კალათის API შეცდომა: ${response.status}`);
    }

    showToast("პროდუქტი წარმატებით დაემატა კალათაში!");
  } catch (error) {
    console.error("Add to cart error:", error);
    showToast("კალათაში დამატება ვერ მოხერხდა.");
  } finally {
    state.addingProducts.delete(String(productId));

    if (button) {
      button.disabled = false;
      button.textContent = button.dataset.originalText || "Add to Cart";
    }
  }
}

function showPageError(message) {
  elements.details.innerHTML = `
    <div class="error-state">
      ${escapeHTML(message)}
    </div>
  `;

  elements.related.innerHTML = "";
}

function bindEvents() {
  elements.details.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const action = button.dataset.action;

    if (action === "decrease") {
      updateQuantity(state.quantity - 1);
      return;
    }

    if (action === "increase") {
      updateQuantity(state.quantity + 1);
      return;
    }

    if (action === "add-main" && state.currentProduct) {
      addToCart(getProductId(state.currentProduct), state.quantity);
    }
  });

  elements.related.addEventListener("click", (event) => {
    const button = event.target.closest(
      'button[data-action="add-related"]'
    );

    if (!button) return;

    event.preventDefault();

    addToCart(button.dataset.productId, 1);
  });
}

async function initDetailsPage() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId || !/^\d+$/.test(productId)) {
    showPageError("პროდუქტი ვერ მოიძებნა. აირჩიე პროდუქტი მენიუდან.");
    return;
  }

  try {
    state.products = await fetchProducts();

    state.currentProduct = state.products.find(
      (product) => getProductId(product) === productId
    );

    if (!state.currentProduct) {
      showPageError("მითითებული პროდუქტი ვერ მოიძებნა.");
      return;
    }

    renderMainProduct(state.currentProduct);
    renderRelatedProducts();
    updateQuantity(state.quantity);
  } catch (error) {
    console.error("Details page error:", error);

    showPageError(
      "პროდუქტის ჩატვირთვა ვერ მოხერხდა. სცადე მოგვიანებით."
    );
  }
}

bindEvents();
initDetailsPage();
