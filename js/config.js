const DEFAULT_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: "",
  productsTable: "products",
  ordersTable: "orders",
  settingsTable: "site_settings",
  storageBucket: "product-images",
  storageFolder: "products",
};

function readRuntimeConfig() {
  if (typeof window === "undefined") {
    return {};
  }

  return window.REDONE_CONFIG || {};
}

export function getAppConfig() {
  const runtimeConfig = readRuntimeConfig();
  return {
    ...DEFAULT_CONFIG,
    ...runtimeConfig,
  };
}

export function isSupabaseConfigured() {
  const config = getAppConfig();
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}
