
const API_URL = "https://restaurantapi.stepacademy.ge/api/";
const STEP_KEY = "d0554fda-79b4-41ee-9fab-88290328049c";


const $ = (selector, parent = document) =>
  parent.querySelector(selector);

const $$ = (selector, parent = document) =>
  [...parent.querySelectorAll(selector)];

const toast = $("#toast");

let toastTimeout;

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

function showToast(message, type = "success") {
  if (!toast) return;

  clearTimeout(toastTimeout);

  toast.textContent = message;
  toast.dataset.type = type;
  toast.hidden = false;

  toastTimeout = setTimeout(() => {
    toast.hidden = true;
  }, 3500);
}



const tabs = $$(".tab");
const panels = $$("[data-panel]");

function activateTab(tabName, moveFocus = false) {
  const selectedTab = tabs.find(
    (tab) => tab.dataset.tab === tabName
  );

  const selectedPanel = panels.find(
    (panel) => panel.dataset.panel === tabName
  );

  if (!selectedTab || !selectedPanel) return;

  tabs.forEach((tab) => {
    const isActive = tab === selectedTab;

    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });

  panels.forEach((panel) => {
    panel.hidden = panel !== selectedPanel;
  });

  if (moveFocus) {
    selectedTab.focus();
  }
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activateTab(tab.dataset.tab);
  });
});


$$(".tabs").forEach((tabList) => {
  tabList.addEventListener("keydown", (event) => {
    const currentIndex = tabs.indexOf(document.activeElement);

    if (currentIndex === -1) return;

    let nextIndex = currentIndex;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = (currentIndex + 1) % tabs.length;
        break;

      case "ArrowLeft":
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;

      case "Home":
        nextIndex = 0;
        break;

      case "End":
        nextIndex = tabs.length - 1;
        break;

      default:
        return;
    }

    event.preventDefault();

    activateTab(tabs[nextIndex].dataset.tab, true);
  });
});



function setFieldError(field, message = "") {
  const errorElement = $(
    `[data-error-for="${field.id}"]`
  );

  field.classList.toggle("is-invalid", Boolean(message));
  field.setAttribute("aria-invalid", String(Boolean(message)));

  if (errorElement) {
    errorElement.textContent = message;
  }
}

function clearFormErrors(form) {
  $$(".field-error", form).forEach((element) => {
    element.textContent = "";
  });

  $$(".input", form).forEach((field) => {
    field.classList.remove("is-invalid");
    field.removeAttribute("aria-invalid");
  });
}

function validateRequiredText(field, label) {
  const value = field.value.trim();

  if (!value) {
    setFieldError(field, `${label} is required.`);
    return false;
  }

  if (value.length < 2) {
    setFieldError(field, `${label} must contain at least 2 characters.`);
    return false;
  }

  setFieldError(field);
  return true;
}



const pictureInput = $("#profile-picture");
const avatarPreview = $("#avatar-preview");

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

if (pictureInput && avatarPreview) {
  pictureInput.addEventListener("change", () => {
    const file = pictureInput.files?.[0];

    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      pictureInput.value = "";
      showToast("Please select a JPG, PNG or WebP image.", "error");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      pictureInput.value = "";
      showToast("The image must be smaller than 2 MB.", "error");
      return;
    }

    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") return;

      const image = document.createElement("img");

      image.src = reader.result;
      image.alt = "Profile picture preview";

      avatarPreview.replaceChildren(image);
    });

    reader.addEventListener("error", () => {
      showToast("Could not load the selected image.", "error");
    });

    reader.readAsDataURL(file);
  });
}



const profileForm = $("#profile-form");

if (profileForm) {
  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();

    clearFormErrors(profileForm);

    const firstName = $("#first-name");
    const lastName = $("#last-name");
    const phone = $("#phone");
    const age = $("#age");

    let isValid = true;

    if (!validateRequiredText(firstName, "First name")) {
      isValid = false;
    }

    if (!validateRequiredText(lastName, "Last name")) {
      isValid = false;
    }

    const phoneValue = phone.value.trim();

    if (
      phoneValue &&
      !/^[+\d()\s.-]{7,25}$/.test(phoneValue)
    ) {
      setFieldError(phone, "Please enter a valid phone number.");
      isValid = false;
    }

    const ageValue = age.value.trim();

    if (ageValue) {
      const parsedAge = Number(ageValue);

      if (
        !Number.isInteger(parsedAge) ||
        parsedAge < 1 ||
        parsedAge > 120
      ) {
        setFieldError(age, "Age must be between 1 and 120.");
        isValid = false;
      }
    }

    if (!isValid) {
      const firstInvalid = $(".input.is-invalid", profileForm);
      firstInvalid?.focus();

      showToast("Please correct the highlighted fields.", "error");
      return;
    }

    const profileData = Object.fromEntries(
      new FormData(profileForm).entries()
    );

  
    console.log("Profile data ready to submit:", {
      ...profileData,
      picture: pictureInput?.files?.[0] ?? null,
    });

    showToast(
      "Form validated successfully. Connect your API to save changes."
    );
  });
}



$$("[data-toggle-password]").forEach((button) => {
  button.addEventListener("click", () => {
    const inputId = button.dataset.togglePassword;
    const input = document.getElementById(inputId);

    if (!input) return;

    const shouldShow = input.type === "password";

    input.type = shouldShow ? "text" : "password";

    button.setAttribute(
      "aria-label",
      `${shouldShow ? "Hide" : "Show"} ${
        inputId.replaceAll("-", " ")
      }`
    );

    button.setAttribute("aria-pressed", String(shouldShow));
  });
});



const newPasswordInput = $("#new-password");
const confirmPasswordInput = $("#confirm-password");

function getPasswordRules(password) {
  return {
    length: password.length >= 8,
    case: /[a-z]/.test(password) && /[A-Z]/.test(password),
    number: /\d/.test(password),
  };
}

function updatePasswordRules() {
  if (!newPasswordInput) return;

  const password = newPasswordInput.value;
  const rules = getPasswordRules(password);

  Object.entries(rules).forEach(([ruleName, isValid]) => {
    const element = $(`[data-rule="${ruleName}"]`);

    if (element) {
      element.classList.toggle("is-valid", isValid);
    }
  });
}

newPasswordInput?.addEventListener("input", updatePasswordRules);


const passwordForm = $("#password-form");

if (passwordForm) {
  passwordForm.addEventListener("submit", (event) => {
    event.preventDefault();

    clearFormErrors(passwordForm);

    const currentPassword = $("#current-password");
    const newPassword = $("#new-password");
    const confirmPassword = $("#confirm-password");

    const currentValue = currentPassword.value;
    const newValue = newPassword.value;
    const confirmValue = confirmPassword.value;

    let isValid = true;

    if (!currentValue) {
      setFieldError(
        currentPassword,
        "Please enter your current password."
      );

      isValid = false;
    }

    const rules = getPasswordRules(newValue);

    if (!rules.length || !rules.case || !rules.number) {
      setFieldError(
        newPassword,
        "Your password does not meet all requirements."
      );

      isValid = false;
    }

    if (newValue && newValue === currentValue) {
      setFieldError(
        newPassword,
        "Your new password must be different from your current password."
      );

      isValid = false;
    }

    if (!confirmValue) {
      setFieldError(
        confirmPassword,
        "Please confirm your new password."
      );

      isValid = false;
    } else if (newValue !== confirmValue) {
      setFieldError(
        confirmPassword,
        "Passwords do not match."
      );

      isValid = false;
    }

    if (!isValid) {
      $(".input.is-invalid", passwordForm)?.focus();

      showToast("Please check your password fields.", "error");
      return;
    }

 
    console.log("Password form validated.");

    showToast(
      "Password validated. Connect your API to update it."
    );
  });
}



const deleteAccountButton = $("#delete-account");

if (deleteAccountButton) {
  deleteAccountButton.addEventListener("click", () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? " +
      "This action may be irreversible."
    );

    if (!confirmed) return;

   

    showToast(
      "Deletion was not performed. Connect your account API.",
      "error"
    );
  });
}



activateTab("personal");

updatePasswordRules();
