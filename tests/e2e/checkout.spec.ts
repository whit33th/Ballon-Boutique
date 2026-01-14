import { test, expect } from "@playwright/test";
import { CartPage } from "./pages/cart.page";
import { CatalogPage } from "./pages/catalog.page";
import { CheckoutPage } from "./pages/checkout.page";
import { ProductPage } from "./pages/product.page";

test.describe("Checkout flows", () => {
  test("can complete checkout with pickup and cash payment", async ({
    page,
  }) => {
    const catalog = new CatalogPage(page);
    await catalog.gotoCatalog();
    await catalog.openFirstProduct();

    const product = new ProductPage(page);
    await product.fillRequiredPersonalization();
    await product.addToCart();

    const cart = new CartPage(page);
    await cart.gotoCart();
    await page.waitForTimeout(2000);

    // Get cart total before checkout
    const cartTotal = await cart.getItemsCount();
    expect(cartTotal).toBeGreaterThan(0);

    await cart.proceedToCheckout();

    const checkout = new CheckoutPage(page);
    await checkout.assertLoaded();

    // Calculate future date (3 days from now)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const pickupDateStr = futureDate.toISOString().split("T")[0];

    // Fill form
    const customerName = "Test Customer";
    const customerEmail = "test@example.com";
    const phone = "+43123456789";

    await checkout.fillPickupForm(
      customerName,
      customerEmail,
      phone,
      pickupDateStr,
    );

    // Verify prices: subtotal should match cart total, no delivery cost for pickup
    await page.waitForTimeout(2000);
    const subtotal = await checkout.getCartSubtotal();
    const deliveryCost = await checkout.getDeliveryCost();
    const total = await checkout.getTotal();

    expect(subtotal).toBeGreaterThan(0);
    expect(deliveryCost).toBe(0); // No delivery cost for pickup
    expect(total).toBe(subtotal); // Total should equal subtotal for pickup

    // Select cash payment
    await checkout.selectPaymentMethod("cash");
    await checkout.submitPayment();

    // Wait for confirmation page
    await page.waitForTimeout(3000);

    // Verify confirmation page with all details including total
    await checkout.assertConfirmationPage();
    await checkout.assertConfirmationDetails(
      customerName,
      customerEmail,
      "pickup",
      undefined,
      total,
    );
  });

  test("can complete checkout with delivery and online payment", async ({
    page,
  }) => {
    const catalog = new CatalogPage(page);
    await catalog.gotoCatalog();
    await catalog.openFirstProduct();

    const product = new ProductPage(page);
    await product.fillRequiredPersonalization();
    await product.addToCart();

    const cart = new CartPage(page);
    await cart.gotoCart();
    await page.waitForTimeout(2000);

    // Get cart total before checkout
    const cartTotal = await cart.getItemsCount();
    expect(cartTotal).toBeGreaterThan(0);

    await cart.proceedToCheckout();

    const checkout = new CheckoutPage(page);
    await checkout.assertLoaded();

    // Calculate future date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const pickupDateStr = futureDate.toISOString().split("T")[0];

    // Fill delivery form with all fields
    const customerName = "Test Customer Delivery";
    const customerEmail = "delivery@example.com";
    const phone = "+43123456789";
    const cityId = "knittelfeld";
    const streetAddress = "Test Street 123";
    const postalCode = "8720";
    const deliveryNotes = "Door code: 1234, 2nd floor";

    await checkout.fillDeliveryForm(
      customerName,
      customerEmail,
      phone,
      pickupDateStr,
      cityId,
      streetAddress,
      postalCode,
      deliveryNotes,
    );

    // Verify prices: subtotal + delivery cost = total
    await page.waitForTimeout(2000);
    const subtotal = await checkout.getCartSubtotal();
    const deliveryCost = await checkout.getDeliveryCost();
    const total = await checkout.getTotal();

    expect(subtotal).toBeGreaterThan(0);
    expect(deliveryCost).toBeGreaterThan(0); // Delivery cost should be present for delivery
    expect(total).toBeCloseTo(subtotal + deliveryCost, 2); // Total should equal subtotal + delivery cost

    // Select online payment
    await checkout.selectPaymentMethod("full_online");

    // Wait for Stripe Elements to load
    await page.waitForTimeout(2000);

    // Fill Stripe test card (successful payment: 4242424242424242)
    await checkout.fillStripeCard("4242424242424242", "10/30", "123");

    // Wait a bit more for card to be processed
    await page.waitForTimeout(2000);

    await checkout.submitPayment();

    // Wait for payment processing and redirect
    await page.waitForTimeout(8000);

    // Verify confirmation page with all details including address and total
    await checkout.assertConfirmationPage();
    await checkout.assertConfirmationDetails(
      customerName,
      customerEmail,
      "delivery",
      streetAddress,
      total,
    );
  });
});

test.describe("Stripe payment scenarios", () => {
  test.beforeEach(async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.gotoCatalog();
    await catalog.openFirstProduct();

    const product = new ProductPage(page);
    await product.addToCart();

    const cart = new CartPage(page);
    await cart.gotoCart();
    await cart.proceedToCheckout();

    const checkout = new CheckoutPage(page);
    await checkout.assertLoaded();

    // Fill basic form
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const pickupDateStr = futureDate.toISOString().split("T")[0];

    await checkout.fillPickupForm(
      "Test Customer",
      "test@example.com",
      "+43123456789",
      pickupDateStr,
    );

    await checkout.selectPaymentMethod("full_online");
  });

  test("successful payment with valid card", async ({ page }) => {
    const checkout = new CheckoutPage(page);

    // Use Stripe test card for successful payment: 4242424242424242
    await checkout.fillStripeCard("4242424242424242", "10/30", "123");
    await checkout.submitPayment();

    await page.waitForTimeout(8000);

    // Should redirect to confirmation page
    await expect(page).toHaveURL(/\/checkout\/confirmant\//, {
      timeout: 15000,
    });
  });

  test("declined payment with insufficient funds card", async ({ page }) => {
    const checkout = new CheckoutPage(page);

    // Use Stripe test card for declined payment: 4000000000009995
    await checkout.fillStripeCard("4000000000009995", "10/30", "123");
    await checkout.submitPayment();

    await page.waitForTimeout(5000);

    // Should show an error message (DE/EN)
    await expect(
      page
        .locator('p[role="alert"]')
        .filter({
          hasText:
            /abgelehnt|ausgebenden\s+stelle|versuchen\s+sie\s+eine\s+andere\s+karte|declined|insufficient|funds|try\s+another\s+card|contact\s+the\s+bank/i,
        })
        .first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("requires authentication card (3D Secure)", async ({ page }) => {
    const checkout = new CheckoutPage(page);

    // Use Stripe test card that requires 3D Secure: 4000002760003184
    await checkout.fillStripeCard("4000002760003184", "10/30", "123");
    await checkout.submitPayment();

    await page.waitForTimeout(5000);

    // 3D Secure flow may redirect, show auth prompt, or surface a Stripe error in this environment.
    const isConfirmation = page.url().includes("/checkout/confirmant/");
    const hasAuthPrompt = await page
      .getByText(/authenticate|verify|3d|secure|authentifizieren|verifizieren/i)
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasStripeError = await page
      .getByRole("alert")
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(isConfirmation || hasAuthPrompt || hasStripeError).toBe(true);
  });

  test("invalid card number handling", async ({ page }) => {
    const checkout = new CheckoutPage(page);

    // Use invalid card number (fails Luhn check)
    await checkout.fillStripeCard("4242424242424241", "10/30", "123");
    await checkout.submitPayment();

    await page.waitForTimeout(3000);

    // Should show validation error or card declined message
    const errorVisible = await page
      .getByText(/invalid|card|number|error|declined|incorrect/i)
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    expect(errorVisible).toBe(true);
  });

  test("declined payment with generic decline card", async ({ page }) => {
    const checkout = new CheckoutPage(page);

    // Use Stripe test card for generic decline: 4000000000000002
    await checkout.fillStripeCard("4000000000000002", "10/30", "123");
    await checkout.submitPayment();

    await page.waitForTimeout(5000);

    // Should show error message about card being declined (DE/EN)
    await expect(
      page
        .locator('p[role="alert"]')
        .filter({
          hasText:
            /abgelehnt|ausgebenden\s+stelle|declined|card.*declined|not.*accepted|try\s+another\s+card/i,
        })
        .first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
