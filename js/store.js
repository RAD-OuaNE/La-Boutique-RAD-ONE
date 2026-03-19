import { defaultProducts } from "../data/products.js";

const PRODUCTS_KEY = "vitrine-products";
const ORDERS_KEY = "vitrine-orders";
const CART_KEY = "vitrine-cart";
const SURVEYS_KEY = "vitrine-surveys";

export function formatEuro(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value || 0);
}

export function getProducts() {
  const raw = localStorage.getItem(PRODUCTS_KEY);
  if (!raw) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(defaultProducts));
    return [...defaultProducts];
  }

  try {
    return JSON.parse(raw);
  } catch {
    return [...defaultProducts];
  }
}

export function saveProducts(products) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

export function getOrders() {
  const raw = localStorage.getItem(ORDERS_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveOrder(order) {
  const orders = getOrders();
  orders.unshift(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function getCart() {
  const raw = localStorage.getItem(CART_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
}

export function getSurveys() {
  const raw = localStorage.getItem(SURVEYS_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSurveys(surveys) {
  localStorage.setItem(SURVEYS_KEY, JSON.stringify(surveys));
}

export function createOrder({ name, phone, note, items }) {
  return {
    id: `CMD-${Date.now()}`,
    createdAt: new Date().toLocaleString("fr-FR"),
    status: "Nouvelle",
    customerName: name,
    phone,
    note,
    items,
  };
}
