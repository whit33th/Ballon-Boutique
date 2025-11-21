import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { stripeWebhook } from "./stripeWebhook";

const http = httpRouter();

http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: stripeWebhook,
});

auth.addHttpRoutes(http);

export default http;
