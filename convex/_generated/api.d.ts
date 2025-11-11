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
import type * as http from "../http.js";
import type * as orders from "../orders.js";
import type * as paymentMutations from "../paymentMutations.js";
import type * as payments from "../payments.js";
import type * as products from "../products.js";
import type * as router from "../router.js";
import type * as users from "../users.js";
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
  http: typeof http;
  orders: typeof orders;
  paymentMutations: typeof paymentMutations;
  payments: typeof payments;
  products: typeof products;
  router: typeof router;
  users: typeof users;
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

export declare const components: {};
