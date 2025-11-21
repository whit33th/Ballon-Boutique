/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as cart from "../cart.js";
import type * as helpers_admin from "../helpers/admin.js";
import type * as helpers_auth from "../helpers/auth.js";
import type * as helpers_products from "../helpers/products.js";
import type * as helpers_stripeClient from "../helpers/stripeClient.js";
import type * as http from "../http.js";
import type * as migrations from "../migrations.js";
import type * as orders from "../orders.js";
import type * as paymentMutations from "../paymentMutations.js";
import type * as payments from "../payments.js";
import type * as paymentsAdmin from "../paymentsAdmin.js";
import type * as paymentsLookup from "../paymentsLookup.js";
import type * as products from "../products.js";
import type * as storage from "../storage.js";
import type * as stripe from "../stripe.js";
import type * as stripeWebhook from "../stripeWebhook.js";
import type * as stripeWebhookHandler from "../stripeWebhookHandler.js";
import type * as users from "../users.js";
import type * as validators_address from "../validators/address.js";
import type * as validators_order from "../validators/order.js";
import type * as validators_product from "../validators/product.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  cart: typeof cart;
  "helpers/admin": typeof helpers_admin;
  "helpers/auth": typeof helpers_auth;
  "helpers/products": typeof helpers_products;
  "helpers/stripeClient": typeof helpers_stripeClient;
  http: typeof http;
  migrations: typeof migrations;
  orders: typeof orders;
  paymentMutations: typeof paymentMutations;
  payments: typeof payments;
  paymentsAdmin: typeof paymentsAdmin;
  paymentsLookup: typeof paymentsLookup;
  products: typeof products;
  storage: typeof storage;
  stripe: typeof stripe;
  stripeWebhook: typeof stripeWebhook;
  stripeWebhookHandler: typeof stripeWebhookHandler;
  users: typeof users;
  "validators/address": typeof validators_address;
  "validators/order": typeof validators_order;
  "validators/product": typeof validators_product;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  migrations: {
    lib: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
      cancelAll: FunctionReference<
        "mutation",
        "internal",
        { sinceTs?: number },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { limit?: number; names?: Array<string> },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      migrate: FunctionReference<
        "mutation",
        "internal",
        {
          batchSize?: number;
          cursor?: string | null;
          dryRun: boolean;
          fnHandle: string;
          name: string;
          next?: Array<{ fnHandle: string; name: string }>;
        },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
    };
  };
};
