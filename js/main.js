import {
  clearCart,
  createOrder,
  formatCurrency,
  getCart,
  getSiteSettings,
  listProducts,
  listSurveys,
  saveCart,
  saveOrder,
  voteSurvey,
} from "./remote-store.js";

const CATEGORY_LABELS = {
  all: "Tout",
  new: "Nouveaux produits",
  parfums: "Parfums",
  maquillage: "Maquillage",
  jouets: "Jouets",
  coffrets: "Coffrets",
  soins_lissage: "Soins lissage",
  soins_botox: "Soins botox",
  kits_soins: "Kits soins",
  accessoires: "Accessoires",
  autres: "Autres",
};

function getCategoryLabel(categoryId) {
  if (!categoryId) {
    return "Autres";
  }

  if (CATEGORY_LABELS[categoryId]) {
    return CATEGORY_LABELS[categoryId];
  }

  return String(categoryId)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

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
  siteSettings: {
    whatsapp: "",
    snapchat: "",
  },
  viewMode: getInitialViewMode(),
  expandedDescriptions: {},
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
const heroSocialLinks = document.querySelector("#heroSocialLinks");

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

function normalizeWhatsappHref(value) {
  const trimmedValue = String(value || "").trim();
  if (!trimmedValue) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  const digits = trimmedValue.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

function normalizeSnapchatHref(value) {
  const trimmedValue = String(value || "").trim();
  if (!trimmedValue) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return `https://www.snapchat.com/add/${encodeURIComponent(trimmedValue.replace(/^@/, ""))}`;
}

function renderHeroSocialLinks() {
  const contacts = [
    {
      kind: "whatsapp",
      label: "WhatsApp",
      value: state.siteSettings.whatsapp,
      href: normalizeWhatsappHref(state.siteSettings.whatsapp),
      icon: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .17 5.33.17 11.9c0 2.1.55 4.16 1.6 5.97L0 24l6.33-1.66a11.86 11.86 0 0 0 5.72 1.46h.01c6.56 0 11.89-5.33 11.9-11.9 0-3.18-1.24-6.16-3.44-8.42Zm-8.46 18.3h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.76.99 1-3.67-.24-.38a9.9 9.9 0 0 1-1.53-5.23c0-5.48 4.46-9.94 9.95-9.94 2.66 0 5.15 1.03 7.02 2.91a9.86 9.86 0 0 1 2.91 7.03c0 5.48-4.46 9.94-9.94 9.94Zm5.45-7.43c-.3-.15-1.76-.87-2.03-.96-.27-.1-.47-.15-.66.15-.2.3-.76.96-.94 1.16-.17.2-.35.22-.65.08-.3-.15-1.27-.47-2.42-1.48a9.16 9.16 0 0 1-1.67-2.07c-.18-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.66-1.6-.9-2.18-.24-.59-.48-.5-.66-.5h-.56c-.2 0-.52.08-.8.37-.27.3-1.05 1.03-1.05 2.52s1.08 2.92 1.23 3.12c.15.2 2.13 3.25 5.16 4.56.72.31 1.29.5 1.73.64.73.23 1.4.2 1.93.12.59-.09 1.76-.72 2-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z"/>
        </svg>`,
    },
    {
      kind: "snapchat",
      label: "Snapchat",
      value: state.siteSettings.snapchat,
      href: normalizeSnapchatHref(state.siteSettings.snapchat),
      icon: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.02 2c2.56 0 4.64 1.99 4.64 4.44 0 .43-.07.85-.2 1.24.67.32 1.14 1.04 1.14 1.86v2.38c0 1.18.87 2.32 2.12 2.75.32.11.52.42.49.76-.03.34-.28.61-.61.68-.84.17-1.38.42-1.64.76-.34.44-.12 1.06.09 1.47.1.19.08.42-.04.6-.12.18-.33.29-.55.28-.16-.01-.4-.02-.61-.02-.57 0-.93.08-1.13.15-.28.1-.52.3-.76.5-.43.35-.88.71-1.66.79a6.45 6.45 0 0 1-1.27.11h-.01c-.44 0-.88-.04-1.31-.11-.78-.08-1.23-.44-1.66-.79-.24-.2-.48-.4-.76-.5-.2-.07-.56-.15-1.13-.15-.21 0-.45.01-.61.02-.22.01-.43-.1-.55-.28a.64.64 0 0 1-.04-.6c.21-.41.43-1.03.09-1.47-.26-.34-.8-.59-1.64-.76a.74.74 0 0 1-.61-.68.73.73 0 0 1 .49-.76c1.25-.43 2.12-1.57 2.12-2.75V9.54c0-.82.47-1.54 1.14-1.86-.13-.39-.2-.81-.2-1.24C7.38 3.99 9.46 2 12.02 2Zm0 1.6c-1.67 0-3.03 1.27-3.03 2.84 0 .43.1.84.29 1.2.12.23.12.51-.01.73-.13.22-.36.37-.62.39-.27.02-.49.24-.49.5v2.66c0 1.52-.8 2.96-2.07 3.86.42.22.79.51 1.08.9.45.58.61 1.29.53 1.99.55.03 1.02.13 1.42.28.52.19.92.51 1.28.8.34.27.64.52 1.03.56.38.07.74.1 1.1.1h.01c.36 0 .72-.03 1.07-.1.42-.04.72-.29 1.06-.56.36-.29.76-.61 1.28-.8.4-.15.87-.25 1.42-.28-.08-.7.08-1.41.53-1.99.29-.39.66-.68 1.08-.9-1.27-.9-2.07-2.34-2.07-3.86V9.26c0-.26-.22-.48-.49-.5a.78.78 0 0 1-.62-.39.77.77 0 0 1-.01-.73c.19-.36.29-.77.29-1.2 0-1.57-1.36-2.84-3.03-2.84Z"/>
        </svg>`,
    },
  ].filter((contact) => contact.value && contact.href);

  if (!contacts.length) {
    heroSocialLinks.hidden = true;
    heroSocialLinks.innerHTML = "";
    return;
  }

  heroSocialLinks.hidden = false;
  heroSocialLinks.innerHTML = contacts
    .map(
      (contact) => `
        <a
          class="hero-social"
          href="${escapeHtml(contact.href)}"
          target="_blank"
          rel="noreferrer"
          aria-label="${escapeHtml(contact.label)}"
          title="${escapeHtml(contact.label)}"
        >
          <span class="hero-social__icon">${contact.icon}</span>
          <span class="hero-social__text">${escapeHtml(contact.label)}</span>
        </a>
      `,
    )
    .join("");
}

function getVisibleProducts() {
  return state.products
    .filter((product) => {
      const matchesCategory =
        state.category === "all"
          ? true
          : state.category === "new"
            ? Boolean(product.newProduct)
            : product.category === state.category;
      const haystack = [product.title, product.description, product.category].join(" ").toLowerCase();
      const matchesSearch = !state.search || haystack.includes(state.search.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((left, right) => {
      const newDelta = Number(Boolean(right.newProduct)) - Number(Boolean(left.newProduct));
      if (newDelta !== 0) {
        return newDelta;
      }

      return Number(Boolean(right.bestSeller)) - Number(Boolean(left.bestSeller));
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
  const categoryIds = ["all"];
  if (state.products.some((product) => product.newProduct)) {
    categoryIds.push("new");
  }
  categoryIds.push(...new Set(state.products.map((product) => product.category)));
  categoryFilters.innerHTML = categoryIds
    .map(
      (categoryId) => `
        <button
          class="chip ${state.category === categoryId ? "chip--active" : ""}"
          type="button"
          data-category="${escapeHtml(categoryId)}"
        >
          ${escapeHtml(getCategoryLabel(categoryId))}
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
          const hasLongDescription = String(product.description || "").trim().length > 120;
          const isExpanded = Boolean(state.expandedDescriptions[product.id]);

          return `
          <article class="product-card product-card--${state.viewMode} card">
            <div class="product-card__image-wrap">
              ${
                product.bestSeller
                  ? '<span class="product-card__stamp" aria-label="Best seller">Best seller</span>'
                  : ""
              }
              <img class="product-card__image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" />
            </div>
            <div class="product-card__body">
              <div class="product-card__badges">
                <span class="badge badge--soft">${escapeHtml(getCategoryLabel(product.category))}</span>
                ${
                  product.newProduct
                    ? '<span class="badge badge--new">Nouveau</span>'
                    : ""
                }
              </div>
              <h3>${escapeHtml(product.title)}</h3>
              <div class="product-card__description-wrap">
                <p class="product-card__description ${isExpanded ? "product-card__description--expanded" : ""}">
                  ${escapeHtml(product.description)}
                </p>
                ${
                  hasLongDescription
                    ? `<button
                        class="product-card__details"
                        type="button"
                        data-toggle-details="${escapeHtml(product.id)}"
                      >
                        ${isExpanded ? "Moins de details" : "Plus de details..."}
                      </button>`
                    : ""
                }
              </div>
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

  productGrid.querySelectorAll("[data-toggle-details]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.dataset.toggleDetails;
      state.expandedDescriptions[productId] = !state.expandedDescriptions[productId];
      renderCatalogue();
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
    const [productsResult, surveysResult, settingsResult] = await Promise.allSettled([
      listProducts(),
      listSurveys({ activeOnly: true }),
      getSiteSettings(),
    ]);

    if (productsResult.status !== "fulfilled") {
      throw productsResult.reason;
    }

    state.products = productsResult.value;
    state.surveys = surveysResult.status === "fulfilled" ? surveysResult.value : [];
    state.siteSettings =
      settingsResult.status === "fulfilled"
        ? settingsResult.value
        : { whatsapp: "", snapchat: "" };
    renderHeroSocialLinks();
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
