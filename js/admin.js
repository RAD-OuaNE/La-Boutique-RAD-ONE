import {
  deleteProduct,
  deleteSurvey,
  formatCurrency,
  getAdminSession,
  listOrders,
  listProducts,
  listSurveys,
  saveProduct,
  saveProductsBatch,
  saveSurvey,
  signInAdmin,
  signOutAdmin,
  toggleProductActive,
  usesRemoteData,
} from "./remote-store.js";

const CATEGORY_LABELS = {
  parfums: "Parfums",
  maquillage: "Maquillage",
  jouets: "Jouets",
  coffrets: "Coffrets",
};

const TARGET_IMAGE_WIDTH = 1200;
const TARGET_IMAGE_HEIGHT = 900;
const PREVIEW_WIDTH = 320;
const PREVIEW_HEIGHT = 240;

const productForm = document.querySelector("#productForm");
const productFormTitle = document.querySelector("#productFormTitle");
const productSubmitButton = document.querySelector("#productSubmitButton");
const productCancelEdit = document.querySelector("#productCancelEdit");
const adminProducts = document.querySelector("#adminProducts");
const adminOrders = document.querySelector("#adminOrders");
const adminMessage = document.querySelector("#adminMessage");
const surveyForm = document.querySelector("#surveyForm");
const surveyTitle = document.querySelector("#surveyTitle");
const surveyDescription = document.querySelector("#surveyDescription");
const surveyActive = document.querySelector("#surveyActive");
const surveyMessage = document.querySelector("#surveyMessage");
const adminSurveys = document.querySelector("#adminSurveys");
const adminLoginForm = document.querySelector("#adminLoginForm");
const adminEmail = document.querySelector("#adminEmail");
const adminPassword = document.querySelector("#adminPassword");
const adminLoginButton = document.querySelector("#adminLoginButton");
const adminLogoutButton = document.querySelector("#adminLogoutButton");
const adminAuthStatus = document.querySelector("#adminAuthStatus");
const adminProtectedArea = document.querySelector("#adminProtectedArea");
const adminLockedState = document.querySelector("#adminLockedState");
const bulkSection = document.querySelector("#bulkSection");
const singleProductSection = document.querySelector("#singleProductSection");
const productsSection = document.querySelector("#productsSection");
const surveysSection = document.querySelector("#surveysSection");
const ordersSection = document.querySelector("#ordersSection");

const imageFileInput = document.querySelector("#productImageFile");
const imageUrlInput = document.querySelector("#productImage");
const imagePreviewWrap = document.querySelector("#imagePreviewWrap");
const imagePreview = document.querySelector("#imagePreview");
const singleImageTools = document.querySelector("#singleImageTools");
const singleOffsetXInput = document.querySelector("#singleOffsetX");
const singleOffsetYInput = document.querySelector("#singleOffsetY");
const singleZoomInput = document.querySelector("#singleZoom");
const singleRotateLeftButton = document.querySelector("#singleRotateLeft");
const singleRotateRightButton = document.querySelector("#singleRotateRight");
const singleFlipXButton = document.querySelector("#singleFlipX");
const singleFlipYButton = document.querySelector("#singleFlipY");
const singleResetCropButton = document.querySelector("#singleResetCrop");

const bulkFilesInput = document.querySelector("#bulkImageFiles");
const bulkDefaultCategory = document.querySelector("#bulkDefaultCategory");
const bulkDefaultQuantity = document.querySelector("#bulkDefaultQuantity");
const bulkDefaultShowPrice = document.querySelector("#bulkDefaultShowPrice");
const applyBulkDefaultsButton = document.querySelector("#applyBulkDefaults");
const bulkDraftsContainer = document.querySelector("#bulkDrafts");
const saveBulkProductsButton = document.querySelector("#saveBulkProducts");

let pendingSingleFile = null;
let bulkDrafts = [];
let singlePreviewObjectUrl = "";
let adminUnlocked = false;
let editingProductId = null;
let singleImageState = {
  naturalWidth: PREVIEW_WIDTH,
  naturalHeight: PREVIEW_HEIGHT,
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
  rotation: 0,
  flipX: false,
  flipY: false,
};

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showMessage(text, type) {
  adminMessage.hidden = false;
  adminMessage.textContent = text;
  adminMessage.className = `message message--${type}`;
}

function showAuthMessage(text, type) {
  adminAuthStatus.hidden = false;
  adminAuthStatus.textContent = text;
  adminAuthStatus.className = `message message--${type}`;
}

function resetProductForm() {
  productForm.reset();
  document.querySelector("#productShowPrice").checked = true;
  productFormTitle.textContent = "Ajouter un produit seul";
  productSubmitButton.textContent = "Ajouter le produit";
  productCancelEdit.hidden = true;
  editingProductId = null;
  pendingSingleFile = null;

  if (singlePreviewObjectUrl) {
    URL.revokeObjectURL(singlePreviewObjectUrl);
    singlePreviewObjectUrl = "";
  }

  resetSingleImageState();
  updateImagePreview("");
  imageUrlInput.value = "";
  imageFileInput.value = "";
}

function startEditingProduct(product) {
  editingProductId = product.id;
  productFormTitle.textContent = "Modifier le produit";
  productSubmitButton.textContent = "Enregistrer les modifications";
  productCancelEdit.hidden = false;

  document.querySelector("#productTitle").value = product.title || "";
  document.querySelector("#productCategory").value = product.category || "parfums";
  document.querySelector("#productPrice").value = product.price ?? "";
  document.querySelector("#productQuantity").value = product.quantity ?? 0;
  document.querySelector("#productDescription").value = product.description || "";
  document.querySelector("#productShowPrice").checked = Boolean(product.showPrice);
  imageUrlInput.value = product.image || "";
  imageFileInput.value = "";
  pendingSingleFile = null;

  if (singlePreviewObjectUrl) {
    URL.revokeObjectURL(singlePreviewObjectUrl);
    singlePreviewObjectUrl = "";
  }

  resetSingleImageState();
  updateImagePreview(product.image || "");
  singleImageTools.hidden = true;
}

function setAdminUnlocked(unlocked, userEmail = "") {
  adminUnlocked = unlocked;
  adminProtectedArea.hidden = !unlocked;
  adminLockedState.hidden = unlocked;
  bulkSection.hidden = false;
  singleProductSection.hidden = !unlocked;
  productsSection.hidden = !unlocked;
  surveysSection.hidden = !unlocked;
  ordersSection.hidden = !unlocked;
  adminLogoutButton.hidden = !unlocked || !usesRemoteData();
  adminLoginButton.hidden = unlocked && usesRemoteData();
  adminEmail.disabled = unlocked && usesRemoteData();
  adminPassword.disabled = unlocked && usesRemoteData();

  if (!usesRemoteData()) {
    showAuthMessage(
      "Mode demo local actif. Ajoute la config Supabase dans js/app-config.js pour proteger cette page et synchroniser les donnees.",
      "success",
    );
    return;
  }

  if (unlocked) {
    showAuthMessage(`Connecte en tant que ${userEmail}.`, "success");
  } else {
    showAuthMessage("Connecte-toi avec un compte admin Supabase pour acceder a la gestion.", "error");
  }
}

function updateImagePreview(source) {
  if (!source) {
    imagePreviewWrap.hidden = true;
    singleImageTools.hidden = true;
    imagePreview.removeAttribute("src");
    imagePreview.removeAttribute("style");
    return;
  }

  imagePreview.src = source;
  imagePreviewWrap.hidden = false;
}

function resetSingleImageState() {
  singleImageState = {
    naturalWidth: PREVIEW_WIDTH,
    naturalHeight: PREVIEW_HEIGHT,
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
    rotation: 0,
    flipX: false,
    flipY: false,
  };

  singleOffsetXInput.value = "0";
  singleOffsetYInput.value = "0";
  singleZoomInput.value = "1";
}

function createCategoryOptions(selectedCategory) {
  return Object.entries(CATEGORY_LABELS)
    .map(
      ([value, label]) =>
        `<option value="${escapeHtml(value)}" ${selectedCategory === value ? "selected" : ""}>${escapeHtml(label)}</option>`,
    )
    .join("");
}

function deriveTitleFromFilename(filename) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRotation(rotation) {
  const normalized = rotation % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function loadImageFromObjectUrl(objectUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Chargement image impossible"));
    image.src = objectUrl;
  });
}

async function readImageMetadata(file) {
  const previewUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageFromObjectUrl(previewUrl);
    return {
      previewUrl,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    };
  } catch (error) {
    URL.revokeObjectURL(previewUrl);
    throw error;
  }
}

function getTransformMetrics({
  naturalWidth,
  naturalHeight,
  zoom = 1,
  rotation = 0,
  offsetX = 0,
  offsetY = 0,
  viewportWidth,
  viewportHeight,
}) {
  const normalizedRotation = normalizeRotation(rotation);
  const quarterTurn = normalizedRotation === 90 || normalizedRotation === 270;
  const effectiveWidth = quarterTurn ? naturalHeight : naturalWidth;
  const effectiveHeight = quarterTurn ? naturalWidth : naturalHeight;

  const baseScale = Math.max(viewportWidth / effectiveWidth, viewportHeight / effectiveHeight);
  const finalScale = baseScale * zoom;

  const maxOffsetX = Math.max(0, (effectiveWidth * finalScale - viewportWidth) / 2);
  const maxOffsetY = Math.max(0, (effectiveHeight * finalScale - viewportHeight) / 2);

  return {
    translateX: (offsetX / 100) * maxOffsetX,
    translateY: (offsetY / 100) * maxOffsetY,
    finalScale,
    rotation: normalizedRotation,
  };
}

function getPreviewImageStyle(draft) {
  const metrics = getTransformMetrics({
    naturalWidth: draft.naturalWidth,
    naturalHeight: draft.naturalHeight,
    zoom: draft.zoom,
    rotation: draft.rotation,
    offsetX: draft.offsetX,
    offsetY: draft.offsetY,
    viewportWidth: PREVIEW_WIDTH,
    viewportHeight: PREVIEW_HEIGHT,
  });

  const scaleX = (draft.flipX ? -1 : 1) * metrics.finalScale;
  const scaleY = (draft.flipY ? -1 : 1) * metrics.finalScale;

  return [
    `width:${draft.naturalWidth}px`,
    `height:${draft.naturalHeight}px`,
    "left:50%",
    "top:50%",
    `transform:translate(calc(-50% + ${metrics.translateX}px), calc(-50% + ${metrics.translateY}px)) rotate(${metrics.rotation}deg) scale(${scaleX}, ${scaleY})`,
  ].join(";");
}

function applySinglePreviewTransform() {
  imagePreview.style.cssText = getPreviewImageStyle(singleImageState);
}

async function processImageFile(
  file,
  {
    naturalWidth,
    naturalHeight,
    zoom = 1,
    rotation = 0,
    offsetX = 0,
    offsetY = 0,
    flipX = false,
    flipY = false,
  } = {},
) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageFromObjectUrl(objectUrl);
    const width = naturalWidth || image.naturalWidth;
    const height = naturalHeight || image.naturalHeight;
    const metrics = getTransformMetrics({
      naturalWidth: width,
      naturalHeight: height,
      zoom,
      rotation,
      offsetX,
      offsetY,
      viewportWidth: TARGET_IMAGE_WIDTH,
      viewportHeight: TARGET_IMAGE_HEIGHT,
    });

    const canvas = document.createElement("canvas");
    canvas.width = TARGET_IMAGE_WIDTH;
    canvas.height = TARGET_IMAGE_HEIGHT;

    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, TARGET_IMAGE_WIDTH, TARGET_IMAGE_HEIGHT);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    context.translate(
      TARGET_IMAGE_WIDTH / 2 + metrics.translateX,
      TARGET_IMAGE_HEIGHT / 2 + metrics.translateY,
    );
    context.rotate((metrics.rotation * Math.PI) / 180);
    context.scale(
      (flipX ? -1 : 1) * metrics.finalScale,
      (flipY ? -1 : 1) * metrics.finalScale,
    );
    context.drawImage(image, -width / 2, -height / 2, width, height);

    return canvas.toDataURL("image/jpeg", 0.88);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function resetBulkDrafts() {
  bulkDrafts.forEach((draft) => URL.revokeObjectURL(draft.previewUrl));
  bulkDrafts = [];
  bulkFilesInput.value = "";
  renderBulkDrafts();
}

async function renderProducts() {
  if (!adminUnlocked) {
    adminProducts.innerHTML = '<div class="empty-state">Connexion requise.</div>';
    return;
  }

  try {
    const products = await listProducts({ includeInactive: true });

    if (!products.length) {
      adminProducts.innerHTML = '<div class="empty-state">Aucun produit.</div>';
      return;
    }

    adminProducts.innerHTML = products
      .map(
        (product) => `
          <article class="admin-item">
            <img class="admin-item__thumb" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" />
            <div class="admin-item__body">
              <strong>${escapeHtml(product.title)}</strong>
              <span>${escapeHtml(CATEGORY_LABELS[product.category] || product.category)}</span>
              <span>${product.showPrice ? escapeHtml(formatCurrency(product.price)) : "Prix masque"}</span>
              <span>${product.quantity > 0 ? `Stock: ${product.quantity}` : "Produit epuise"}</span>
            </div>
            <button
              type="button"
              class="button button--secondary"
              data-toggle="${escapeHtml(product.id)}"
            >
              ${product.active ? "Masquer" : "Publier"}
            </button>
            <button
              type="button"
              class="button button--secondary"
              data-edit="${escapeHtml(product.id)}"
            >
              Modifier
            </button>
            <button
              type="button"
              class="button button--secondary"
              data-delete="${escapeHtml(product.id)}"
            >
              Supprimer
            </button>
          </article>
        `,
      )
      .join("");

    adminProducts.querySelectorAll("[data-toggle]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await toggleProductActive(button.dataset.toggle);
          await renderProducts();
        } catch (error) {
          showMessage(error.message || "Mise a jour du produit impossible.", "error");
        }
      });
    });

    adminProducts.querySelectorAll("[data-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const product = products.find((item) => item.id === button.dataset.edit);
        if (!product) {
          return;
        }

        startEditingProduct(product);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    adminProducts.querySelectorAll("[data-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        const product = products.find((item) => item.id === button.dataset.delete);
        if (!product) {
          return;
        }

        const confirmed = window.confirm(`Supprimer "${product.title}" ?`);
        if (!confirmed) {
          return;
        }

        try {
          await deleteProduct(product.id);
          if (editingProductId === product.id) {
            resetProductForm();
          }
          await renderProducts();
          showMessage("Produit supprime.", "success");
        } catch (error) {
          showMessage(error.message || "Suppression impossible.", "error");
        }
      });
    });
  } catch (error) {
    adminProducts.innerHTML = `<div class="empty-state">${escapeHtml(
      error.message || "Chargement produits impossible.",
    )}</div>`;
  }
}

async function renderOrders() {
  if (!adminUnlocked) {
    adminOrders.innerHTML = '<div class="empty-state">Connexion requise.</div>';
    return;
  }

  try {
    const orders = await listOrders();

    if (!orders.length) {
      adminOrders.innerHTML = '<div class="empty-state">Aucune demande enregistree.</div>';
      return;
    }

    adminOrders.innerHTML = orders
      .map(
        (order) => `
          <article class="order-card">
            <div class="section-head">
              <h3>${escapeHtml(order.id)}</h3>
              <span class="badge">${escapeHtml(order.status)}</span>
            </div>
            <p><strong>${escapeHtml(order.customerName)}</strong> - ${escapeHtml(order.phone)}</p>
            <p>${escapeHtml(order.createdAt)}</p>
            <ul class="order-card__list">
              ${order.items
                .map(
                  (item) =>
                    `<li>${escapeHtml(item.title)} x ${escapeHtml(String(item.quantity))}</li>`,
                )
                .join("")}
            </ul>
            ${order.note ? `<p class="order-card__note">${escapeHtml(order.note)}</p>` : ""}
          </article>
        `,
      )
      .join("");
  } catch (error) {
    adminOrders.innerHTML = `<div class="empty-state">${escapeHtml(
      error.message || "Chargement demandes impossible.",
    )}</div>`;
  }
}

function showSurveyMessage(text, type) {
  surveyMessage.hidden = false;
  surveyMessage.textContent = text;
  surveyMessage.className = `message message--${type}`;
}

async function renderSurveysAdmin() {
  if (!adminUnlocked) {
    adminSurveys.innerHTML = '<div class="empty-state">Connexion requise.</div>';
    return;
  }

  try {
    const surveys = await listSurveys();

    if (!surveys.length) {
      adminSurveys.innerHTML = '<div class="empty-state">Aucun sondage pour le moment.</div>';
      return;
    }

    adminSurveys.innerHTML = surveys
      .map(
        (survey) => `
          <article class="survey-card">
            <strong>${escapeHtml(survey.title)}</strong>
            <p>${escapeHtml(survey.description)}</p>
            <div class="survey-card__stats">
              <span>Interesses: ${survey.interestedCount}</span>
              <span>Pas interesses: ${survey.notInterestedCount}</span>
              <span>${survey.active ? "Publie" : "Masque"}</span>
            </div>
            <div class="survey-card__actions">
              <button class="button button--secondary" type="button" data-survey-toggle="${escapeHtml(
                survey.id,
              )}">
                ${survey.active ? "Masquer" : "Publier"}
              </button>
              <button class="button button--secondary" type="button" data-survey-delete="${escapeHtml(
                survey.id,
              )}">
                Supprimer
              </button>
            </div>
          </article>
        `,
      )
      .join("");

    adminSurveys.querySelectorAll("[data-survey-toggle]").forEach((button) => {
      button.addEventListener("click", async () => {
        const surveysList = await listSurveys();
        const survey = surveysList.find((item) => item.id === button.dataset.surveyToggle);
        if (!survey) {
          return;
        }

        try {
          await saveSurvey({ ...survey, active: !survey.active });
          await renderSurveysAdmin();
        } catch (error) {
          showSurveyMessage(error.message || "Mise a jour du sondage impossible.", "error");
        }
      });
    });

    adminSurveys.querySelectorAll("[data-survey-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        const surveysList = await listSurveys();
        const survey = surveysList.find((item) => item.id === button.dataset.surveyDelete);
        if (!survey) {
          return;
        }

        if (!window.confirm(`Supprimer le sondage "${survey.title}" ?`)) {
          return;
        }

        try {
          await deleteSurvey(survey.id);
          await renderSurveysAdmin();
          showSurveyMessage("Sondage supprime.", "success");
        } catch (error) {
          showSurveyMessage(error.message || "Suppression du sondage impossible.", "error");
        }
      });
    });
  } catch (error) {
    adminSurveys.innerHTML = `<div class="empty-state">${escapeHtml(
      error.message || "Chargement sondages impossible.",
    )}</div>`;
  }
}

function renderBulkDrafts() {
  saveBulkProductsButton.disabled = bulkDrafts.length === 0;

  if (!bulkDrafts.length) {
    bulkDraftsContainer.className = "bulk-grid empty-state";
    bulkDraftsContainer.innerHTML =
      "Selectionne plusieurs photos pour preparer des produits en lot.";
    return;
  }

  bulkDraftsContainer.className = "bulk-grid";
  bulkDraftsContainer.innerHTML = bulkDrafts
    .map(
      (draft) => `
        <article class="bulk-card" data-draft-id="${escapeHtml(draft.id)}">
          <div class="bulk-card__preview">
            <div class="bulk-card__preview-frame">
              <img
                class="bulk-card__preview-image"
                src="${escapeHtml(draft.previewUrl)}"
                alt="${escapeHtml(draft.title)}"
                style="${getPreviewImageStyle(draft)}"
              />
            </div>
          </div>

          <div class="bulk-card__fields">
            <label>
              <span>Titre</span>
              <input class="input" type="text" data-field="title" value="${escapeHtml(draft.title)}" />
            </label>

            <label>
              <span>Categorie</span>
              <select class="input" data-field="category">
                ${createCategoryOptions(draft.category)}
              </select>
            </label>

            <label>
              <span>Prix</span>
              <input
                class="input"
                type="number"
                min="0"
                step="0.01"
                data-field="price"
                value="${escapeHtml(draft.price)}"
              />
            </label>

            <label>
              <span>Stock</span>
              <input
                class="input"
                type="number"
                min="0"
                step="1"
                data-field="quantity"
                value="${escapeHtml(draft.quantity)}"
              />
            </label>

            <label>
              <span>Description</span>
              <textarea class="input textarea" rows="3" data-field="description">${escapeHtml(draft.description)}</textarea>
            </label>

            <label class="checkbox-row checkbox-row--compact">
              <input type="checkbox" data-field="showPrice" ${draft.showPrice ? "checked" : ""} />
              <span>Afficher le prix</span>
            </label>

            <div class="bulk-card__crop">
              <label>
                <span>Deplacement horizontal</span>
                <input type="range" min="-100" max="100" value="${draft.offsetX}" data-field="offsetX" />
              </label>
              <label>
                <span>Deplacement vertical</span>
                <input type="range" min="-100" max="100" value="${draft.offsetY}" data-field="offsetY" />
              </label>
              <label>
                <span>Zoom</span>
                <input type="range" min="1" max="3" step="0.05" value="${draft.zoom}" data-field="zoom" />
              </label>
            </div>

            <div class="bulk-card__toolbar">
              <button class="button button--secondary" type="button" data-action="rotate-left">
                Rotation gauche
              </button>
              <button class="button button--secondary" type="button" data-action="rotate-right">
                Rotation droite
              </button>
              <button class="button button--secondary" type="button" data-action="flip-x">
                Miroir horizontal
              </button>
              <button class="button button--secondary" type="button" data-action="flip-y">
                Miroir vertical
              </button>
              <button class="button button--secondary" type="button" data-action="reset-crop">
                Reinitialiser
              </button>
            </div>

            <button class="button button--secondary" type="button" data-remove="${escapeHtml(draft.id)}">
              Retirer
            </button>
          </div>
        </article>
      `,
    )
    .join("");

  bulkDraftsContainer.querySelectorAll("[data-field]").forEach((field) => {
    field.addEventListener("input", (event) => {
      const card = event.target.closest("[data-draft-id]");
      const draft = bulkDrafts.find((item) => item.id === card.dataset.draftId);
      const fieldName = event.target.dataset.field;

      if (!draft || !fieldName) {
        return;
      }

      if (fieldName === "showPrice") {
        draft.showPrice = event.target.checked;
      } else if (fieldName === "offsetX" || fieldName === "offsetY" || fieldName === "zoom") {
        draft[fieldName] = Number(event.target.value);
      } else if (fieldName === "quantity") {
        draft[fieldName] = Math.max(0, Number(event.target.value || 0));
      } else {
        draft[fieldName] = event.target.value;
      }

      if (fieldName === "offsetX" || fieldName === "offsetY" || fieldName === "zoom") {
        const previewImage = card.querySelector(".bulk-card__preview-image");
        previewImage.style.cssText = getPreviewImageStyle(draft);
      }
    });
  });

  bulkDraftsContainer.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest("[data-draft-id]");
      const draft = bulkDrafts.find((item) => item.id === card.dataset.draftId);

      if (!draft) {
        return;
      }

      switch (button.dataset.action) {
        case "rotate-left":
          draft.rotation -= 90;
          break;
        case "rotate-right":
          draft.rotation += 90;
          break;
        case "flip-x":
          draft.flipX = !draft.flipX;
          break;
        case "flip-y":
          draft.flipY = !draft.flipY;
          break;
        case "reset-crop":
          draft.offsetX = 0;
          draft.offsetY = 0;
          draft.zoom = 1;
          draft.rotation = 0;
          draft.flipX = false;
          draft.flipY = false;
          break;
        default:
          break;
      }

      renderBulkDrafts();
    });
  });

  bulkDraftsContainer.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const draftToRemove = bulkDrafts.find((draft) => draft.id === button.dataset.remove);
      if (draftToRemove) {
        URL.revokeObjectURL(draftToRemove.previewUrl);
      }

      bulkDrafts = bulkDrafts.filter((draft) => draft.id !== button.dataset.remove);
      renderBulkDrafts();
    });
  });
}

async function refreshAdminData() {
  await Promise.all([renderProducts(), renderOrders(), renderSurveysAdmin()]);
}

async function unlockAdmin(userEmail = "") {
  setAdminUnlocked(true, userEmail);
  await refreshAdminData();
}

async function lockAdmin() {
  setAdminUnlocked(false);
  adminProducts.innerHTML = '<div class="empty-state">Connexion requise.</div>';
  adminSurveys.innerHTML = '<div class="empty-state">Connexion requise.</div>';
  adminOrders.innerHTML = '<div class="empty-state">Connexion requise.</div>';
}

imageFileInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0] || null;
  pendingSingleFile = file;

  if (!file) {
    if (singlePreviewObjectUrl) {
      URL.revokeObjectURL(singlePreviewObjectUrl);
      singlePreviewObjectUrl = "";
    }
    resetSingleImageState();
    updateImagePreview(imageUrlInput.value.trim());
    return;
  }

  if (singlePreviewObjectUrl) {
    URL.revokeObjectURL(singlePreviewObjectUrl);
  }

  imageUrlInput.value = "";
  singlePreviewObjectUrl = URL.createObjectURL(file);
  resetSingleImageState();
  updateImagePreview(singlePreviewObjectUrl);
  singleImageTools.hidden = false;
  loadImageFromObjectUrl(singlePreviewObjectUrl).then((image) => {
    singleImageState.naturalWidth = image.naturalWidth;
    singleImageState.naturalHeight = image.naturalHeight;
    applySinglePreviewTransform();
  });
});

imageUrlInput.addEventListener("input", (event) => {
  if (event.target.value.trim()) {
    pendingSingleFile = null;
    imageFileInput.value = "";
    if (singlePreviewObjectUrl) {
      URL.revokeObjectURL(singlePreviewObjectUrl);
      singlePreviewObjectUrl = "";
    }
  }

  singleImageTools.hidden = true;
  updateImagePreview(event.target.value.trim());
});

productCancelEdit.addEventListener("click", () => {
  resetProductForm();
});

surveyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!adminUnlocked) {
    showSurveyMessage("Connexion admin requise.", "error");
    return;
  }

  try {
    await saveSurvey({
      title: surveyTitle.value.trim(),
      description: surveyDescription.value.trim(),
      active: surveyActive.checked,
    });

    surveyForm.reset();
    surveyActive.checked = true;
    showSurveyMessage("Sondage ajoute.", "success");
    await renderSurveysAdmin();
  } catch (error) {
    showSurveyMessage(error.message || "Ajout du sondage impossible.", "error");
  }
});

singleOffsetXInput.addEventListener("input", () => {
  singleImageState.offsetX = Number(singleOffsetXInput.value);
  applySinglePreviewTransform();
});

singleOffsetYInput.addEventListener("input", () => {
  singleImageState.offsetY = Number(singleOffsetYInput.value);
  applySinglePreviewTransform();
});

singleZoomInput.addEventListener("input", () => {
  singleImageState.zoom = Number(singleZoomInput.value);
  applySinglePreviewTransform();
});

singleRotateLeftButton.addEventListener("click", () => {
  singleImageState.rotation -= 90;
  applySinglePreviewTransform();
});

singleRotateRightButton.addEventListener("click", () => {
  singleImageState.rotation += 90;
  applySinglePreviewTransform();
});

singleFlipXButton.addEventListener("click", () => {
  singleImageState.flipX = !singleImageState.flipX;
  applySinglePreviewTransform();
});

singleFlipYButton.addEventListener("click", () => {
  singleImageState.flipY = !singleImageState.flipY;
  applySinglePreviewTransform();
});

singleResetCropButton.addEventListener("click", () => {
  resetSingleImageState();
  applySinglePreviewTransform();
});

bulkFilesInput.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);

  if (!files.length) {
    resetBulkDrafts();
    return;
  }

  resetBulkDrafts();
  showMessage("Preparation des brouillons photo...", "success");

  try {
    bulkDrafts = await Promise.all(
      files.map(async (file, index) => {
        const metadata = await readImageMetadata(file);
        return {
          id: `draft-${Date.now()}-${index}`,
          file,
          previewUrl: metadata.previewUrl,
          naturalWidth: metadata.naturalWidth,
          naturalHeight: metadata.naturalHeight,
          title: deriveTitleFromFilename(file.name),
          category: bulkDefaultCategory.value,
          quantity: Math.max(0, Number(bulkDefaultQuantity.value || 0)),
          price: "",
          description: "",
          showPrice: bulkDefaultShowPrice.checked,
          offsetX: 0,
          offsetY: 0,
          zoom: 1,
          rotation: 0,
          flipX: false,
          flipY: false,
        };
      }),
    );

    renderBulkDrafts();
    showMessage(`${bulkDrafts.length} photo(s) preparees pour l'import en lot.`, "success");
  } catch {
    resetBulkDrafts();
    showMessage("Impossible de preparer une ou plusieurs photos du lot.", "error");
  }
});

applyBulkDefaultsButton.addEventListener("click", () => {
  if (!bulkDrafts.length) {
    showMessage("Ajoute d'abord quelques photos dans l'import en lot.", "error");
    return;
  }

  bulkDrafts = bulkDrafts.map((draft) => ({
    ...draft,
    category: bulkDefaultCategory.value,
    quantity: Math.max(0, Number(bulkDefaultQuantity.value || 0)),
    showPrice: bulkDefaultShowPrice.checked,
  }));

  renderBulkDrafts();
  showMessage("Les reglages par defaut ont ete appliques aux brouillons.", "success");
});

saveBulkProductsButton.addEventListener("click", async () => {
  if (!adminUnlocked) {
    showMessage("Connexion admin requise.", "error");
    return;
  }

  if (!bulkDrafts.length) {
    return;
  }

  const invalidDraft = bulkDrafts.find((draft) => !draft.title.trim());
  if (invalidDraft) {
    showMessage("Chaque produit du lot doit avoir au moins un titre.", "error");
    return;
  }

  saveBulkProductsButton.disabled = true;
  showMessage("Traitement des images en cours...", "success");

  try {
    const newProducts = [];

    for (const draft of bulkDrafts) {
      const processedImage = await processImageFile(draft.file, {
        naturalWidth: draft.naturalWidth,
        naturalHeight: draft.naturalHeight,
        zoom: draft.zoom,
        rotation: draft.rotation,
        offsetX: draft.offsetX,
        offsetY: draft.offsetY,
        flipX: draft.flipX,
        flipY: draft.flipY,
      });

      newProducts.push({
        id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: draft.title.trim(),
        category: draft.category,
        price: Number(draft.price || 0),
        quantity: Math.max(0, Number(draft.quantity || 0)),
        image: processedImage,
        description: draft.description.trim(),
        showPrice: draft.showPrice,
        active: true,
      });
    }

    await saveProductsBatch(newProducts);
    resetBulkDrafts();
    await renderProducts();
    showMessage(`${newProducts.length} produit(s) ajoutes depuis l'import en lot.`, "success");
  } catch (error) {
    showMessage(error.message || "Une erreur est survenue pendant le traitement des images.", "error");
  } finally {
    saveBulkProductsButton.disabled = bulkDrafts.length === 0;
  }
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!adminUnlocked) {
    showMessage("Connexion admin requise.", "error");
    return;
  }

  try {
    const isEditing = Boolean(editingProductId);
    let image = imageUrlInput.value.trim();
    if (pendingSingleFile) {
      image = await processImageFile(pendingSingleFile, singleImageState);
    }

    if (!image) {
      showMessage("Ajoute une photo depuis ton appareil ou colle une URL d'image.", "error");
      return;
    }

    const newProduct = {
      id: editingProductId || `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: document.querySelector("#productTitle").value.trim(),
      category: document.querySelector("#productCategory").value,
      price: Number(document.querySelector("#productPrice").value || 0),
      quantity: Math.max(0, Number(document.querySelector("#productQuantity").value || 0)),
      image,
      description: document.querySelector("#productDescription").value.trim(),
      showPrice: document.querySelector("#productShowPrice").checked,
      active: true,
    };

    await saveProduct(newProduct);
    resetProductForm();
    showMessage(
      isEditing ? "Produit modifie dans la vitrine." : "Produit ajoute dans la vitrine.",
      "success",
    );
    await renderProducts();
  } catch (error) {
    showMessage(error.message || "Impossible de preparer cette image.", "error");
  }
});

adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!usesRemoteData()) {
    await unlockAdmin("mode-local@demo");
    return;
  }

  adminLoginButton.disabled = true;
  showAuthMessage("Connexion en cours...", "success");

  try {
    const authData = await signInAdmin(adminEmail.value.trim(), adminPassword.value);
    const email = authData.user?.email || adminEmail.value.trim();
    adminPassword.value = "";
    await unlockAdmin(email);
  } catch (error) {
    await lockAdmin();
    showAuthMessage(error.message || "Connexion admin impossible.", "error");
  } finally {
    adminLoginButton.disabled = false;
  }
});

adminLogoutButton.addEventListener("click", async () => {
  try {
    await signOutAdmin();
  } catch (error) {
    showAuthMessage(error.message || "Deconnexion impossible.", "error");
  } finally {
    adminEmail.value = "";
    adminPassword.value = "";
    await lockAdmin();
  }
});

async function init() {
  renderBulkDrafts();
  resetProductForm();

  if (!usesRemoteData()) {
    await unlockAdmin("mode-local@demo");
    return;
  }

  try {
    const { session } = await getAdminSession();
    if (session?.user?.email) {
      adminEmail.value = session.user.email;
      await unlockAdmin(session.user.email);
      return;
    }
  } catch (error) {
    showAuthMessage(error.message || "Lecture session impossible.", "error");
  }

  await lockAdmin();
}

init();
