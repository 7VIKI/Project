(() => {
  "use strict";

  const root = document.querySelector("#site-header");

  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  root.innerHTML = `
    <header class="navbar" id="site-navbar">
      <div class="nav-container">

        <a href="./index.html" class="logo">Foodie</a>

        <button
          class="burger-toggle"
          id="siteMenuToggle"
          type="button"
          aria-label="Open navigation menu"
          aria-expanded="false"
          aria-controls="site-navigation"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav
          class="nav-links"
          id="site-navigation"
          aria-label="Main navigation"
        >
          <a class="nav-link" href="./index.html" data-page="index.html">
            Home
          </a>

          <a class="nav-link" href="./menu.html" data-page="menu.html">
            Menu
          </a>

          <a class="cart" href="./cart.html" data-page="cart.html">
            Cart
          </a>

          <a href="./login.html" id="loginBtn" class="nav-link">
            Login
          </a>

          <a href="./register.html" id="signupBtn" class="signup">
            Sign Up
          </a>

          <a
            href="./profile.html"
            id="profileBtn"
            class="profile"
            style="display: none"
          >
            Profile
          </a>
        </nav>
      </div>
    </header>
  `;

  const navbar = root.querySelector(".navbar");
  const toggle = root.querySelector("#siteMenuToggle");
  const navigation = root.querySelector("#site-navigation");

  function closeMenu() {
    navbar.classList.remove("menu-open");
    navigation.classList.remove("open");
    toggle.classList.remove("is-active");

    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation menu");

    document.body.classList.remove("navigation-open");
  }

  toggle.addEventListener("click", () => {
    const isOpen = !navbar.classList.contains("menu-open");

    navbar.classList.toggle("menu-open", isOpen);
    navigation.classList.toggle("open", isOpen);
    toggle.classList.toggle("is-active", isOpen);

    toggle.setAttribute("aria-expanded", String(isOpen));

    document.body.classList.toggle("navigation-open", isOpen);
  });

  navigation.querySelectorAll("a").forEach((link) => {
    const currentPage =
      window.location.pathname.split("/").pop() || "index.html";

    const linkPage = link.dataset.page || link.getAttribute("href");

    if (
      linkPage &&
      linkPage.split("/").pop() === currentPage
    ) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }

    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  document.addEventListener("click", (event) => {
    if (
      navbar.classList.contains("menu-open") &&
      !navbar.contains(event.target)
    ) {
      closeMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) closeMenu();
  });
})();