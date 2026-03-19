import {
  clearCart,
  createOrder,
  formatCurrency,
  getCart,
  listProducts,
  listSurveys,
  saveCart,
  saveOrder,
  voteSurvey,
} from "./remote-store.js";

const CATEGORY_LABELS = {
  all: "Tout",
  parfums: "Parfums",
  maquillage: "Maquillage",
  jouets: "Jouets",
  coffrets: "Coffrets",
};

const SURVEY_VOTES_KEY = "vitrine-survey-votes";
const VIEW_MODE_KEY = "vitrine-view-mode";

function getInitialViewMode() {
  const stored = localStorage.getItem(VIEW_MODE_KEY);
  return ["large", "compact", "list"].includes(stored) ? stored : "large";
}

const state = {
  products: [],
  cart: getCart(),
  search: "",
  category: "all",
  surveys: [],
  viewMode: getInitialViewMode(),
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
const surveyList = document.querySelector("#surveyList");
const viewModeControls = document.querySelector("#viewModeControls");

function getSurveyVotes() {
  try {
    return JSON.parse(localStorage.getItem(SURVEY_VOTES_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveSurveyVotes(votes) {
  localStorage.setItem(SURVEY_VOTES_KEY, JSON.stringify(votes));
}

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
  dataModeHint.textContent =
    "Pour envoyer une demande, ajoute d'abord les produits qui t'interessent dans le panier.";
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

      const safeQuantity = Math.min(Number(quantity || 0), Number(product.quantity ?? 0));
      if (safeQuantity <= 0) {
        return null;
      }

      return { ...product, quantity: safeQuantity };
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

function renderViewModeControls() {
  viewModeControls.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("chip--active", button.dataset.view === state.viewMode);
  });
}

function renderCatalogue() {
  const visibleProducts = getVisibleProducts();
  productGrid.className = `product-grid product-grid--${state.viewMode}`;

  if (!visibleProducts.length) {
    productGrid.innerHTML = '<div class="empty-state">Aucun produit ne correspond a la recherche.</div>';
  } else {
    productGrid.innerHTML = visibleProducts
      .map(
        (product) => {
          const inCartQuantity = Number(state.cart[product.id] || 0);

          return `
          <article class="product-card product-card--${state.viewMode} card">
            <div class="product-card__image-wrap">
              <img class="product-card__image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" />
            </div>
            <div class="product-card__body">
              <span class="badge badge--soft">${escapeHtml(CATEGORY_LABELS[product.category] || product.category)}</span>
              <h3>${escapeHtml(product.title)}</h3>
              <p>${escapeHtml(product.description)}</p>
              <div class="survey-card__stats">
                <span>${product.quantity > 0 ? `Stock: ${product.quantity}` : "Produit epuise"}</span>
                ${
                  inCartQuantity > 0
                    ? `<span class="product-card__cart-note">${inCartQuantity} dans le panier</span>`
                    : ""
                }
              </div>
              <div class="product-card__footer">
                <strong>${product.showPrice ? escapeHtml(formatCurrency(product.price)) : "Prix sur demande"}</strong>
                <button class="button" type="button" data-add="${escapeHtml(product.id)}" ${
                  product.quantity <= 0 ? "disabled" : ""
                }>
                  ${
                    product.quantity > 0
                      ? inCartQuantity > 0
                        ? "Ajouter encore"
                        : "Ajouter"
                      : "Epuise"
                  }
                </button>
              </div>
            </div>
          </article>
        `;
        },
      )
      .join("");
  }

  productGrid.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.dataset.add;
      const product = state.products.find((item) => item.id === productId);
      if (!product || Number(product.quantity ?? 0) <= 0) {
        return;
      }

      const nextQuantity = (state.cart[productId] || 0) + 1;
      if (nextQuantity > Number(product.quantity ?? 0)) {
        showFormMessage("La quantite demandee depasse le stock disponible.", "error");
        return;
      }

      state.cart[productId] = nextQuantity;
      saveCart(state.cart);
      renderCatalogue();
      renderCart();
    });
  });

  productCount.textContent = String(state.products.length);
  categoryCount.textContent = String(new Set(state.products.map((product) => product.category)).size);
  renderViewModeControls();
}

function renderCart() {
  const lines = getCartLines();
  const validCart = Object.fromEntries(lines.map((item) => [item.id, item.quantity]));
  if (JSON.stringify(validCart) !== JSON.stringify(state.cart)) {
    state.cart = validCart;
    saveCart(state.cart);
  }
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
      renderCatalogue();
      renderCart();
    });
  });

  cartItems.querySelectorAll("[data-increase]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.dataset.increase;
      const product = state.products.find((item) => item.id === productId);
      if (!product) {
        return;
      }

      const nextQuantity = state.cart[productId] + 1;
      if (nextQuantity > Number(product.quantity ?? 0)) {
        showFormMessage("La quantite demandee depasse le stock disponible.", "error");
        return;
      }

      state.cart[productId] = nextQuantity;
      saveCart(state.cart);
      renderCatalogue();
      renderCart();
    });
  });
}

function renderSurveys() {
  if (!state.surveys.length) {
    surveyList.innerHTML = '<div class="empty-state">Aucun sondage disponible pour le moment.</div>';
    return;
  }

  const surveyVotes = getSurveyVotes();
  surveyList.innerHTML = state.surveys
    .map(
      (survey) => {
        const alreadyVoted = Boolean(surveyVotes[survey.id]);

        return `
          <article class="survey-card">
            <strong>${escapeHtml(survey.title)}</strong>
            <p>${escapeHtml(survey.description || "Dis-nous si ce produit t'interesserait.")}</p>
            <div class="survey-card__stats">
              <span>Interesses: ${survey.interestedCount}</span>
              <span>Pas interesses: ${survey.notInterestedCount}</span>
            </div>
            ${
              alreadyVoted
                ? `<div class="message message--success">Vote deja enregistre sur cet appareil.</div>`
                : ""
            }
            <div class="survey-card__actions">
              <button class="button" type="button" data-vote="${escapeHtml(survey.id)}" data-vote-type="interested" ${
                alreadyVoted ? "disabled" : ""
              }>
                Interesse
              </button>
              <button class="button button--secondary" type="button" data-vote="${escapeHtml(
                survey.id,
              )}" data-vote-type="not_interested" ${alreadyVoted ? "disabled" : ""}>
                Pas pour moi
              </button>
            </div>
          </article>
        `;
      },
    )
    .join("");

  surveyList.querySelectorAll("[data-vote]").forEach((button) => {
    button.addEventListener("click", async () => {
      const surveyId = button.dataset.vote;
      const voteType = button.dataset.voteType;
      button.disabled = true;

      try {
        await voteSurvey(surveyId, voteType);
        const surveyVotes = getSurveyVotes();
        surveyVotes[surveyId] = voteType;
        saveSurveyVotes(surveyVotes);
        state.surveys = await listSurveys({ activeOnly: true });
        renderSurveys();
      } catch (error) {
        surveyList.insertAdjacentHTML(
          "afterbegin",
          `<div class="message message--error">${escapeHtml(error.message || "Vote impossible.")}</div>`,
        );
      } finally {
        button.disabled = false;
      }
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
    state.products = await listProducts();
    orderForm.reset();
    showFormMessage(`Demande envoyee sous ${order.id}.`, "success");
    renderCatalogue();
    renderCart();
  } catch (error) {
    showFormMessage(error.message || "Envoi impossible pour le moment.", "error");
  }
}

async function init() {
  showDataModeHint();

  try {
    const [productsResult, surveysResult] = await Promise.allSettled([
      listProducts(),
      listSurveys({ activeOnly: true }),
    ]);

    if (productsResult.status !== "fulfilled") {
      throw productsResult.reason;
    }

    state.products = productsResult.value;
    state.surveys = surveysResult.status === "fulfilled" ? surveysResult.value : [];
    renderFilters();
    renderCatalogue();
    renderCart();
    renderSurveys();
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

viewModeControls.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    state.viewMode = button.dataset.view;
    localStorage.setItem(VIEW_MODE_KEY, state.viewMode);
    renderCatalogue();
  });
});

orderForm.addEventListener("submit", handleOrderSubmit);

init();
