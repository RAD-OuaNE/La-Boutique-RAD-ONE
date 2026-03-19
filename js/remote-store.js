import {
  clearCart as clearLocalCart,
  createOrder as createLocalOrder,
  formatEuro,
  getCart as getLocalCart,
  getOrders as getLocalOrders,
  getProducts as getLocalProducts,
  saveCart as saveLocalCart,
  saveOrder as saveLocalOrder,
  saveProducts as saveLocalProducts,
} from "./store.js";
import { getAppConfig, isSupabaseConfigured } from "./config.js";

let supabaseClient = null;

function getSupabase() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (supabaseClient) {
    return supabaseClient;
  }

  const browserSupabase = window.supabase;
  if (!browserSupabase?.createClient) {
    throw new Error("Client Supabase indisponible dans la page.");
  }

  const config = getAppConfig();
  supabaseClient = browserSupabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  return supabaseClient;
}

function mapProductRow(row) {
  return {
    id: row.id,
    title: row.title || "",
    category: row.category || "parfums",
    description: row.description || "",
    price: Number(row.price || 0),
    showPrice: Boolean(row.show_price),
    active: row.active !== false,
    image: row.image || "",
  };
}

function mapProductInput(product) {
  return {
    id: product.id,
    title: product.title,
    category: product.category,
    description: product.description,
    price: Number(product.price || 0),
    show_price: Boolean(product.showPrice),
    active: product.active !== false,
    image: product.image,
  };
}

function mapOrderRow(row) {
  return {
    id: row.id,
    createdAt: row.created_at
      ? new Date(row.created_at).toLocaleString("fr-FR")
      : new Date().toLocaleString("fr-FR"),
    status: row.status || "Nouvelle",
    customerName: row.customer_name || "",
    phone: row.phone || "",
    note: row.note || "",
    items: Array.isArray(row.items) ? row.items : [],
  };
}

function createProductId() {
  return `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeFilenamePart(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function uploadDataUrl(dataUrl, productTitle) {
  const client = getSupabase();
  const config = getAppConfig();
  if (!client) {
    return dataUrl;
  }

  if (!dataUrl.startsWith("data:image/")) {
    return dataUrl;
  }

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Format d'image non supporte.");
  }

  const mimeType = match[1];
  const base64Payload = match[2];
  const bytes = Uint8Array.from(atob(base64Payload), (char) => char.charCodeAt(0));
  const extension = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const filename = sanitizeFilenamePart(productTitle || "produit") || "produit";
  const path = `${config.storageFolder}/${Date.now()}-${filename}.${extension}`;

  const { error: uploadError } = await client.storage
    .from(config.storageBucket)
    .upload(path, bytes, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Televersement image impossible.");
  }

  const { data } = client.storage.from(config.storageBucket).getPublicUrl(path);
  return data.publicUrl;
}

export function usesRemoteData() {
  return isSupabaseConfigured();
}

export function formatCurrency(value) {
  return formatEuro(value);
}

export function getCart() {
  return getLocalCart();
}

export function saveCart(cart) {
  saveLocalCart(cart);
}

export function clearCart() {
  clearLocalCart();
}

export function createOrder(payload) {
  return createLocalOrder(payload);
}

export async function listProducts({ includeInactive = false } = {}) {
  const client = getSupabase();
  if (!client) {
    const products = getLocalProducts();
    return includeInactive ? products : products.filter((product) => product.active);
  }

  const config = getAppConfig();
  let query = client
    .from(config.productsTable)
    .select("id,title,category,description,price,show_price,active,image,created_at")
    .order("created_at", { ascending: false });

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || "Lecture des produits impossible.");
  }

  return (data || []).map(mapProductRow);
}

export async function saveProduct(product) {
  const client = getSupabase();
  if (!client) {
    const products = getLocalProducts();
    saveLocalProducts([product, ...products]);
    return product;
  }

  const config = getAppConfig();
  const productWithId = {
    ...product,
    id: product.id || createProductId(),
  };

  const image = await uploadDataUrl(productWithId.image, productWithId.title);
  const payload = mapProductInput({ ...productWithId, image });

  const { error } = await client.from(config.productsTable).upsert(payload);
  if (error) {
    throw new Error(error.message || "Enregistrement produit impossible.");
  }

  return { ...productWithId, image };
}

export async function saveProductsBatch(products) {
  const client = getSupabase();
  if (!client) {
    const existingProducts = getLocalProducts();
    saveLocalProducts([...products, ...existingProducts]);
    return products;
  }

  const savedProducts = [];
  for (const product of products) {
    savedProducts.push(await saveProduct(product));
  }
  return savedProducts;
}

export async function toggleProductActive(productId) {
  const client = getSupabase();
  if (!client) {
    const products = getLocalProducts().map((product) =>
      product.id === productId ? { ...product, active: !product.active } : product,
    );
    saveLocalProducts(products);
    return;
  }

  const config = getAppConfig();
  const { data, error: readError } = await client
    .from(config.productsTable)
    .select("active")
    .eq("id", productId)
    .single();

  if (readError) {
    throw new Error(readError.message || "Lecture produit impossible.");
  }

  const { error } = await client
    .from(config.productsTable)
    .update({ active: data.active === false })
    .eq("id", productId);

  if (error) {
    throw new Error(error.message || "Mise a jour produit impossible.");
  }
}

export async function deleteProduct(productId) {
  const client = getSupabase();
  if (!client) {
    const products = getLocalProducts().filter((product) => product.id !== productId);
    saveLocalProducts(products);
    return;
  }

  const config = getAppConfig();
  const { error } = await client.from(config.productsTable).delete().eq("id", productId);
  if (error) {
    throw new Error(error.message || "Suppression produit impossible.");
  }
}

export async function listOrders() {
  const client = getSupabase();
  if (!client) {
    return getLocalOrders();
  }

  const config = getAppConfig();
  const { data, error } = await client
    .from(config.ordersTable)
    .select("id,created_at,status,customer_name,phone,note,items")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Lecture des demandes impossible.");
  }

  return (data || []).map(mapOrderRow);
}

export async function saveOrder(order) {
  const client = getSupabase();
  if (!client) {
    saveLocalOrder(order);
    return order;
  }

  const config = getAppConfig();
  const payload = {
    id: order.id,
    status: order.status,
    customer_name: order.customerName,
    phone: order.phone,
    note: order.note,
    items: order.items,
  };

  const { error } = await client.from(config.ordersTable).insert(payload);
  if (error) {
    throw new Error(error.message || "Envoi de la demande impossible.");
  }

  return order;
}

export async function signInAdmin(email, password) {
  const client = getSupabase();
  if (!client) {
    return { user: { email: "mode-local@demo" } };
  }

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(error.message || "Connexion admin impossible.");
  }

  return data;
}

export async function signOutAdmin() {
  const client = getSupabase();
  if (!client) {
    return;
  }

  const { error } = await client.auth.signOut();
  if (error) {
    throw new Error(error.message || "Deconnexion impossible.");
  }
}

export async function getAdminSession() {
  const client = getSupabase();
  if (!client) {
    return { session: { user: { email: "mode-local@demo" } } };
  }

  const { data, error } = await client.auth.getSession();
  if (error) {
    throw new Error(error.message || "Session admin indisponible.");
  }

  return data;
}
