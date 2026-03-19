import {
  clearCart,
  createOrder,
  formatCurrency,
  getCart,
  listProducts,
  saveCart,
  saveOrder,
  usesRemoteData,
} from "./remote-store.js";

const CATEGORY_LABELS = {
  all: "Tout",
  parfums: "Parfums",
  maquillage: "Maquillage",
  jouets: "Jouets",
  coffrets: "Coffrets",
};

const state = {
  products: [],
  cart: getCart(),
  search: "",
  category: "all",
};

const productGrid = document.querySelector("#productGrid");
const categoryFilters = document.querySelector("#categoryFilters");
const cartItems = document.querySelector("#cartItems");
const cartCount = document.querySelector("#cartCount");
const cartTotal = document.querySelector("#cartTotal");
const productCount = document.querySelector("#productCount");
const categoryCount = document.querySelector("#categoryCount");
const searchInput = document.querySelector("#searchInput");
const orderForm = document.querySelector("#orderForm");
const formMessage = document.querySelector("#formMessage");
const dataModeHint = document.querySelector("#dataModeHint");

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showDataModeHint() {
  dataModeHint.hidden = false;
  dataModeHint.className = "message message--success";
  dataModeHint.textContent = usesRemoteData()
    ? "Mode connecte: les produits et demandes passent par Supabase."
    : "Mode demo local: ajoute ta config Supabase dans js/app-config.js pour activer les vraies donnees.";
}

function showFormMessage(text, type) {
  formMessage.hidden = false;
  formMessage.textContent = text;
  formMessage.className = `message message--${type}`;
}

function getVisibleProducts() {
  return state.products.filter((product) => {
    const matchesCategory = state.category === "all" || product.category === state.category;
    const haystack = [product.title, product.description, product.category].join(" ").toLowerCase();
    const matchesSearch = !state.search || haystack.includes(state.search.toLowerCase());
    return matchesCategory && matchesSearch;
  });
}

function getCartLines() {
  return Object.entries(state.cart)
    .map(([productId, quantity]) => {
      const product = state.products.find((item) => item.id === productId);
      if (!product) {
        return null;
      }

      return { ...product, quantity };
    })
    .filter(Boolean);
}

function renderFilters() {
  const categoryIds = ["all", ...new Set(state.products.map((product) => product.category))];
  categoryFilters.innerHTML = categoryIds
    .map(
      (categoryId) => `
        <button
          class="chip ${state.category === categoryId ? "chip--active" : ""}"
          type="button"
          data-category="${escapeHtml(categoryId)}"
        >
          ${escapeHtml(CATEGORY_LABELS[categoryId] || categoryId)}
        </button>
      `,
    )
    .join("");

  categoryFilters.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      renderFilters();
      renderCatalogue();
    });
  });
}

function renderCatalogue() {
  const visibleProducts = getVisibleProducts();

  if (!visibleProducts.length) {
    productGrid.innerHTML = '<div class="empty-state">Aucun produit ne correspond a la recherche.</div>';
  } else {
    productGrid.innerHTML = visibleProducts
      .map(
        (product) => `
          <article class="product-card card">
            <div class="product-card__image-wrap">
              <img class="product-card__image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" />
            </div>
            <div class="product-card__body">
              <span class="badge badge--soft">${escapeHtml(CATEGORY_LABELS[product.category] || product.category)}</span>
              <h3>${escapeHtml(product.title)}</h3>
              <p>${escapeHtml(product.description)}</p>
              <div class="product-card__footer">
                <strong>${product.showPrice ? escapeHtml(formatCurrency(product.price)) : "Prix sur demande"}</strong>
                <button class="button" type="button" data-add="${escapeHtml(product.id)}">Ajouter</button>
              </div>
            </div>
          </article>
        `,
      )
      .join("");
  }

  productGrid.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.dataset.add;
      state.cart[productId] = (state.cart[productId] || 0) + 1;
      saveCart(state.cart);
      renderCart();
    });
  });

  productCount.textContent = String(state.products.length);
  categoryCount.textContent = String(new Set(state.products.map((product) => product.category)).size);
}

function renderCart() {
  const lines = getCartLines();
  const totalQuantity = lines.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = lines.reduce(
    (sum, item) => sum + (item.showPrice ? item.price * item.quantity : 0),
    0,
  );

  cartCount.textContent = String(totalQuantity);
  cartTotal.textContent = formatCurrency(totalPrice);

  if (!lines.length) {
    cartItems.className = "basket__items empty-state";
    cartItems.innerHTML = "Aucun produit pour le moment.";
    return;
  }

  cartItems.className = "basket__items";
  cartItems.innerHTML = lines
    .map(
      (item) => `
        <div class="basket-line">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <div>${item.showPrice ? escapeHtml(formatCurrency(item.price)) : "Prix sur demande"}</div>
          </div>
          <div class="basket-line__actions">
            <button type="button" class="mini-btn" data-decrease="${escapeHtml(item.id)}">-</button>
            <span>${item.quantity}</span>
            <button type="button" class="mini-btn" data-increase="${escapeHtml(item.id)}">+</button>
          </div>
        </div>
      `,
    )
    .join("");

  cartItems.querySelectorAll("[data-decrease]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.dataset.decrease;
      state.cart[productId] -= 1;
      if (state.cart[productId] <= 0) {
        delete state.cart[productId];
      }
      saveCart(state.cart);
      renderCart();
    });
  });

  cartItems.querySelectorAll("[data-increase]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.dataset.increase;
      state.cart[productId] += 1;
      saveCart(state.cart);
      renderCart();
    });
  });
}

async function handleOrderSubmit(event) {
  event.preventDefault();
  const name = document.querySelector("#customerName").value.trim();
  const phone = document.querySelector("#customerPhone").value.trim();
  const note = document.querySelector("#customerNote").value.trim();
  const lines = getCartLines();

  if (!name || !phone || !lines.length) {
    showFormMessage("Renseigne le nom, le telephone et au moins un produit.", "error");
    return;
  }

  const order = createOrder({
    name,
    phone,
    note,
    items: lines.map((item) => ({
      productId: item.id,
      title: item.title,
      quantity: item.quantity,
    })),
  });

  try {
    await saveOrder(order);
    clearCart();
    state.cart = {};
    orderForm.reset();
    showFormMessage(`Demande envoyee sous ${order.id}.`, "success");
    renderCart();
  } catch (error) {
    showFormMessage(error.message || "Envoi impossible pour le moment.", "error");
  }
}

async function init() {
  showDataModeHint();

  try {
    state.products = await listProducts();
    renderFilters();
    renderCatalogue();
    renderCart();
  } catch (error) {
    productGrid.innerHTML = `<div class="empty-state">${escapeHtml(
      error.message || "Chargement catalogue impossible.",
    )}</div>`;
  }
}

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderCatalogue();
});

orderForm.addEventListener("submit", handleOrderSubmit);

init();
