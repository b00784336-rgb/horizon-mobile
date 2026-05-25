/**
 * In-App Purchases — expo-in-app-purchases
 * Produits : com.horizondate.monthly | com.horizondate.yearly
 * Après achat : vérifie le receipt côté serveur → /api/mobile/iap/verify
 */

import * as InAppPurchases from "expo-in-app-purchases";
import { supabase } from "./supabase";

export const IAP_PRODUCTS = {
  MONTHLY: "com.horizondate.monthly",  // ~9,99€/mois
  YEARLY: "com.horizondate.yearly",    // ~59,99€/an
};

const API_BASE = "https://horizondate.app";

let initialized = false;

export async function initIAP(): Promise<void> {
  if (initialized) return;
  try {
    await InAppPurchases.connectAsync();
    initialized = true;
  } catch (e) {
    console.warn("[IAP] connectAsync error:", e);
  }
}

export async function getProducts() {
  try {
    const { responseCode, results } = await InAppPurchases.getProductsAsync([
      IAP_PRODUCTS.MONTHLY,
      IAP_PRODUCTS.YEARLY,
    ]);
    if (responseCode === InAppPurchases.IAPResponseCode.OK) {
      return results ?? [];
    }
  } catch (e) {
    console.warn("[IAP] getProducts error:", e);
  }
  return [];
}

export async function purchaseProduct(productId: string): Promise<boolean> {
  try {
    await InAppPurchases.purchaseItemAsync(productId);
    return true;
  } catch (e) {
    console.warn("[IAP] purchase error:", e);
    return false;
  }
}

/**
 * Vérifie le receipt auprès de notre serveur Next.js
 * et met à jour is_premium dans le profil.
 */
export async function verifyAndActivate(receipt: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const res = await fetch(`${API_BASE}/api/mobile/iap/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ receipt }),
    });

    const json = await res.json();
    return json?.success === true;
  } catch (e) {
    console.warn("[IAP] verify error:", e);
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();
    if (responseCode !== InAppPurchases.IAPResponseCode.OK || !results?.length) {
      return false;
    }

    // Prend le receipt le plus récent
    const latest = results[results.length - 1];
    if (!latest.transactionReceipt) return false;

    return await verifyAndActivate(latest.transactionReceipt);
  } catch (e) {
    console.warn("[IAP] restore error:", e);
    return false;
  }
}

export async function disconnectIAP(): Promise<void> {
  if (!initialized) return;
  try {
    await InAppPurchases.disconnectAsync();
    initialized = false;
  } catch (_) {}
}
