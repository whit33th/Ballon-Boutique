import { auth } from "./auth";
import { stripeWebhook } from "./stripeWebhook";
import { httpRouter } from "convex/server";
const http = httpRouter();

http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: stripeWebhook,
});

auth.addHttpRoutes(http);

export default http;
