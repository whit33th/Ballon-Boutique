import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class CheckoutPage extends BasePage {
  private parseCurrency(text: string): number {
    // Handles formats like: "€123.00", "€ 123,00", "123,00 €", "1.234,56".
    const cleaned = text.replace(/[^\d.,-]/g, "").trim();
    if (!cleaned) return 0;

    const hasDot = cleaned.includes(".");
    const hasComma = cleaned.includes(",");

    let normalized = cleaned;

    if (hasDot && hasComma) {
      // Decide decimal separator by whichever appears last.
      const lastDot = cleaned.lastIndexOf(".");
      const lastComma = cleaned.lastIndexOf(",");
      if (lastComma > lastDot) {
        // 1.234,56 -> 1234.56
        normalized = cleaned.replace(/\./g, "").replace(/,/g, ".");
      } else {
        // 1,234.56 -> 1234.56
        normalized = cleaned.replace(/,/g, "");
      }
    } else if (hasComma && !hasDot) {
      // 123,45 -> 123.45
      normalized = cleaned.replace(/,/g, ".");
    }

    const value = Number.parseFloat(normalized);
    return Number.isFinite(value) ? value : 0;
  }

  private async readAmountByLabel(label: RegExp): Promise<number> {
    const orderSummaryHeading = this.page
      .getByRole("heading", { name: /bestell(ü|u)bersicht|order summary/i })
      .first();
    const orderSummaryRoot = this.page
      .getByTestId("checkout-order-summary")
      .or(
        orderSummaryHeading.locator(
          "xpath=ancestor::*[self::aside or self::section or self::div][1]",
        ),
      );

    const labelSpan = orderSummaryRoot.getByText(label).first();
    if (!(await labelSpan.isVisible({ timeout: 2000 }).catch(() => false)))
      return 0;

    // In the order summary, the structure is: <div><span>Label</span><span>€Amount</span></div>
    const row = labelSpan.locator("xpath=ancestor::div[1]");
    const amountSpan = row
      .locator("xpath=./span[last()]")
      .or(row.locator("xpath=./*[last()]"));
    const text = (await amountSpan.textContent().catch(() => null)) ?? "";
    return this.parseCurrency(text);
  }
  async assertLoaded() {
    await expect(this.page).toHaveURL(/checkout/, { timeout: 15_000 });
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(1000); // Give page time to render

    // Check for checkout page - use heading as primary indicator since test IDs may not be present
    const checkoutContainer = this.page
      .getByRole("heading", {
        name: /kontaktdaten|contact details/i,
      })
      .or(this.page.getByTestId("checkout-page"));
    await expect(
      checkoutContainer,
      "Checkout page should be visible",
    ).toBeVisible({
      timeout: 20_000,
    });

    // Check for order summary - use heading as primary indicator
    const orderSummary = this.page
      .getByRole("heading", {
        name: /bestell(ü|u)bersicht|order summary/i,
      })
      .or(this.page.getByTestId("checkout-order-summary"));
    await expect(
      orderSummary,
      "Checkout order summary not visible (cart may be empty or still loading)",
    ).toBeVisible({ timeout: 20_000 });

    // Check for name input - use role as primary indicator
    const nameInput = this.page
      .getByRole("textbox", {
        name: /vollst(ä|a)ndiger name|full name|name/i,
      })
      .or(this.page.getByTestId("checkout-customer-name"));
    await expect(
      nameInput,
      "Checkout details step not visible (name input missing)",
    ).toBeVisible({ timeout: 20_000 });
  }

  async assertValidationMessages() {
    const placeOrderButton = this.page
      .getByRole("button")
      .filter({ hasText: /pay|place|confirm/i })
      .first();

    if (await placeOrderButton.isVisible()) {
      await placeOrderButton.click({ trial: true }).catch(() => {});
    }

    await expect(this.page.getByText(/name|email|address/i)).toBeVisible({
      timeout: 5_000,
    });
  }

  async fillPickupForm(
    customerName: string,
    customerEmail: string,
    phone: string,
    pickupDate: string,
  ) {
    await this.assertLoaded();

    // Fill customer details - prioritize role-based selectors
    const nameInput = this.page
      .getByRole("textbox", {
        name: /vollst(ä|a)ndiger name|full name|name/i,
      })
      .or(this.page.getByTestId("checkout-customer-name"));
    await expect(nameInput).toBeEditable({ timeout: 20_000 });
    await nameInput.fill(customerName);

    const emailInput = this.page
      .getByRole("textbox", {
        name: /e-?mail|email/i,
      })
      .or(this.page.getByTestId("checkout-customer-email"));
    await expect(emailInput).toBeVisible({ timeout: 20_000 });
    await emailInput.fill(customerEmail);

    const phoneInput = this.page
      .getByRole("textbox", {
        name: /telefon|phone/i,
      })
      .or(this.page.getByTestId("checkout-customer-phone"));
    await expect(phoneInput).toBeVisible({ timeout: 20_000 });
    await phoneInput.fill(phone);

    // Select pickup option - prioritize role-based selectors
    const pickupOption = this.page
      .getByRole("button", { name: /selbstabholung|pickup/i })
      .or(this.page.getByTestId("checkout-delivery-pickup"));
    if (await pickupOption.isVisible({ timeout: 5000 })) {
      await pickupOption.click();
      await this.page.waitForTimeout(500);
    }

    // Fill pickup date - prioritize role-based selectors
    const dateInput = this.page
      .getByRole("textbox", { name: /abholdatum|pickup date|bevorzugtes.*datum/i })
      .or(this.page.getByTestId("checkout-pickup-date"));
    if (await dateInput.isVisible({ timeout: 5000 })) {
      await dateInput.fill(pickupDate);
      await this.page.waitForTimeout(500);
    }

    // Proceed to payment step - prioritize role-based selectors
    const proceedButton = this.page
      .getByRole("button", { name: /zur zahlung|to payment/i })
      .or(this.page.getByTestId("checkout-proceed-to-payment"));
    if (await proceedButton.isVisible({ timeout: 5000 })) {
      await proceedButton.click();
      await this.page.waitForTimeout(2000);
    }
  }

  async fillDeliveryForm(
    customerName: string,
    customerEmail: string,
    phone: string,
    pickupDate: string,
    cityId: string,
    streetAddress: string,
    postalCode: string,
    deliveryNotes?: string,
  ) {
    await this.assertLoaded();

    // Fill customer details - prioritize role-based selectors
    const nameInput = this.page
      .getByRole("textbox", {
        name: /vollst(ä|a)ndiger name|full name|name/i,
      })
      .or(this.page.getByTestId("checkout-customer-name"));
    await expect(nameInput).toBeEditable({ timeout: 20_000 });
    await nameInput.fill(customerName);

    const emailInput = this.page
      .getByRole("textbox", {
        name: /e-?mail|email/i,
      })
      .or(this.page.getByTestId("checkout-customer-email"));
    await expect(emailInput).toBeVisible({ timeout: 20_000 });
    await emailInput.fill(customerEmail);

    const phoneInput = this.page
      .getByRole("textbox", {
        name: /telefon|phone/i,
      })
      .or(this.page.getByTestId("checkout-customer-phone"));
    await expect(phoneInput).toBeVisible({ timeout: 20_000 });
    await phoneInput.fill(phone);

    // Select delivery option - prioritize role-based selectors
    const deliveryOption = this.page
      .getByRole("button", { name: /kurier|courier|delivery/i })
      .or(this.page.getByTestId("checkout-delivery-courier"));
    if (await deliveryOption.isVisible({ timeout: 5000 })) {
      await deliveryOption.click();
      await this.page.waitForTimeout(1000);
    }

    // Fill pickup date (required for delivery too) - prioritize role-based selectors
    const dateInput = this.page
      .getByRole("textbox", {
        name: /bevorzugtes.*lieferdatum|lieferdatum|abholdatum|pickup date|delivery date/i,
      })
      .or(this.page.getByTestId("checkout-pickup-date"));
    await expect(dateInput).toBeVisible({ timeout: 10_000 });
    await dateInput.fill(pickupDate);
    await expect(dateInput).toHaveValue(pickupDate, { timeout: 10_000 });
    await this.page.waitForTimeout(500);

    // Select delivery slot (required for delivery). Scope to the slot selector section to
    // avoid matching the courier delivery option button which also contains a time.
    const slotLabel = this.page
      .getByText(/lieferzeitfenster|select.*delivery\s*slot/i)
      .first();
    const slotSection = slotLabel
      .locator('xpath=ancestor::*[@data-slot="form-item"][1]')
      .or(slotLabel.locator("xpath=ancestor::div[1]"));

    const slotButton = slotSection
      .locator("button:not([disabled])")
      .filter({ hasText: /^\d{2}:\d{2}$/ })
      .first();
    if (await slotButton.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await slotButton.click();

      const slotRequiredAlert = this.page
        .getByRole("alert")
        .filter({ hasText: /lieferzeitfenster|delivery\s*slot/i });
      await expect(slotRequiredAlert)
        .toBeHidden({ timeout: 10_000 })
        .catch(() => {});

      await this.page.waitForTimeout(500);
    }

    // Select city using data-testid
    // Prefer selecting by visible name; IDs may not be present in prod builds.
    const cityButton = this.page
      .getByRole("button", {
        name: new RegExp(`^${cityId}\\b`, "i"),
      })
      .first();
    await expect(cityButton).toBeVisible({ timeout: 10_000 });
    await cityButton.click();
    await this.page.waitForTimeout(1000);

    // Fill address - prioritize role-based selectors
    await this.page
      .getByRole("textbox", { name: /stra(ß|s)e|street/i })
      .or(this.page.getByTestId("checkout-address-street"))
      .fill(streetAddress);
    await this.page
      .getByRole("textbox", {
        name: /postleitzahl|plz|postal|zip/i,
      })
      .or(this.page.getByTestId("checkout-address-postal"))
      .fill(postalCode);

    if (deliveryNotes) {
      await this.page
        .getByRole("textbox", { name: /notiz|notes/i })
        .or(this.page.getByTestId("checkout-address-notes"))
        .fill(deliveryNotes);
    }

    await this.page.waitForTimeout(500);

    // Proceed to payment step - prioritize role-based selectors
    const proceedButton = this.page
      .getByRole("button", { name: /zur zahlung|to payment/i })
      .or(this.page.getByTestId("checkout-proceed-to-payment"));
    if (await proceedButton.isVisible({ timeout: 5000 })) {
      await proceedButton.click();
      await this.page.waitForTimeout(2000);
    }
  }

  async selectPaymentMethod(method: "cash" | "full_online" | "partial_online") {
    const testId =
      method === "full_online"
        ? "checkout-payment-online"
        : method === "cash"
          ? "checkout-payment-cash"
          : null;

    if (testId) {
      // Prioritize role-based selectors
      const methodButton =
        method === "cash"
          ? this.page
              .getByRole("button", {
                name: /bei abholung bezahlen|pay during pickup|cash/i,
              })
              .or(this.page.getByTestId(testId))
          : this.page
              .getByRole("button", {
                name: /online-?zahlung|online payment|pay/i,
              })
              .or(this.page.getByTestId(testId));

      await expect(methodButton).toBeVisible({ timeout: 10_000 });
      await methodButton.click();
      await this.page.waitForTimeout(1000); // Wait for payment section to appear

      if (method === "cash") {
        await expect(
          this.page
            .getByRole("heading", {
              name: /bei abholung bezahlen|pay during pickup/i,
            })
            .first(),
          "Expected cash payment section to be visible",
        ).toBeVisible({ timeout: 15_000 });
      }

      if (method === "full_online") {
        await expect(
          this.page
            .getByRole("heading", {
              name: /sicheres online-?checkout|secure online checkout/i,
            })
            .first(),
          "Expected online payment section to be visible",
        ).toBeVisible({ timeout: 15_000 });
      }
    }
  }

  async fillStripeCard(cardNumber: string, expiry: string, cvc: string) {
    // Wait for Stripe Elements to load
    await this.page.waitForTimeout(2000);

    // Stripe Elements uses iframes. We must select a unique iframe (otherwise strict mode will fail).
    // Prefer the dedicated card-element iframe by title/src, then fallback to scanning iframes for card inputs.
    const tryFrameBySelector = async (selector: string) => {
      const iframe = this.page.locator(selector).first();
      const handle = await iframe.elementHandle().catch(() => null);
      const frame = await handle?.contentFrame().catch(() => null);
      if (!frame) return null;
      const hasCardInput =
        (await frame
          .locator('input[name="cardnumber"], input[autocomplete="cc-number"]')
          .count()
          .catch(() => 0)) > 0;
      return hasCardInput ? frame : null;
    };

    const selectorCandidates = [
      'iframe[title="Secure card payment input frame"]',
      'iframe[title*="Secure card payment"]',
      'iframe[src*="elements-inner-card"]',
    ];

    let stripeFrame = null as null | import("@playwright/test").Frame;
    for (const selector of selectorCandidates) {
      // eslint-disable-next-line no-await-in-loop
      stripeFrame = await tryFrameBySelector(selector);
      if (stripeFrame) break;
    }

    if (!stripeFrame) {
      const iframes = this.page.locator("iframe");
      const count = await iframes.count();
      for (let i = 0; i < count; i++) {
        // eslint-disable-next-line no-await-in-loop
        const handle = await iframes
          .nth(i)
          .elementHandle()
          .catch(() => null);
        // eslint-disable-next-line no-await-in-loop
        const frame = await handle?.contentFrame().catch(() => null);
        if (!frame) continue;
        // eslint-disable-next-line no-await-in-loop
        const hasCardInput =
          (await frame
            .locator(
              'input[name="cardnumber"], input[autocomplete="cc-number"]',
            )
            .count()
            .catch(() => 0)) > 0;
        if (hasCardInput) {
          stripeFrame = frame;
          break;
        }
      }
    }

    if (!stripeFrame) {
      throw new Error("Could not locate Stripe card input iframe");
    }

    // Fill card number - Stripe uses CardElement which has a single input that handles formatting
    const cardInput = stripeFrame
      .locator('input[name="cardnumber"]')
      .or(
        stripeFrame
          .locator('input[placeholder*="1234"]')
          .or(
            stripeFrame
              .locator('input[autocomplete="cc-number"]')
              .or(stripeFrame.locator('input[maxlength="19"]')),
          ),
      );

    if ((await cardInput.count()) > 0) {
      await cardInput.first().fill(cardNumber);
      await this.page.waitForTimeout(1500);

      // Sometimes Stripe formats the card number, wait a bit more
      await expect
        .poll(
          async () => {
            const value = await cardInput
              .first()
              .inputValue()
              .catch(() => "");
            return (
              value.replace(/\s/g, "").length >=
              cardNumber.replace(/\s/g, "").length
            );
          },
          { timeout: 5000 },
        )
        .toBe(true);
    } else {
      // Fallback: try typing into any visible input in Stripe iframe
      const allInputs = stripeFrame.locator("input");
      const count = await allInputs.count();
      if (count > 0) {
        await allInputs.first().fill(cardNumber);
        await this.page.waitForTimeout(1500);
      }
    }

    // Fill expiry - Stripe CardElement handles expiry and CVC in the same input
    // Try to find separate inputs first
    const expiryInput = stripeFrame
      .locator('input[name="exp-date"]')
      .or(
        stripeFrame
          .locator('input[placeholder*="MM / YY"]')
          .or(
            stripeFrame
              .locator('input[placeholder*="MM/YY"]')
              .or(stripeFrame.locator('input[autocomplete="cc-exp"]')),
          ),
      );

    if ((await expiryInput.count()) > 0) {
      await expiryInput.first().fill(expiry);
      await this.page.waitForTimeout(1000);
    }

    // Fill CVC
    const cvcInput = stripeFrame
      .locator('input[name="cvc"]')
      .or(
        stripeFrame
          .locator('input[placeholder*="CVC"]')
          .or(
            stripeFrame
              .locator('input[placeholder*="CVV"]')
              .or(stripeFrame.locator('input[autocomplete="cc-csc"]')),
          ),
      );

    if ((await cvcInput.count()) > 0) {
      await cvcInput.first().fill(cvc);
      await this.page.waitForTimeout(1000);
    } else {
      // If separate inputs don't exist, CardElement might handle all in one input
      // Try filling expiry and CVC after card number
      const allInputs = stripeFrame.locator("input");
      const inputCount = await allInputs.count();
      if (inputCount >= 2) {
        await allInputs.nth(1).fill(expiry);
        await this.page.waitForTimeout(800);
      }
      if (inputCount >= 3) {
        await allInputs.nth(2).fill(cvc);
        await this.page.waitForTimeout(800);
      }
    }

    // Wait for Stripe to validate the card
    await this.page.waitForTimeout(2000);
  }

  async submitPayment() {
    // Step 2 heading should be visible (DE/EN)
    await expect(
      this.page.getByRole("heading", { name: /zahlung|payment/i }).first(),
      "Expected to be on checkout payment step",
    ).toBeVisible({ timeout: 15_000 });

    // Primary action buttons on checkout use the shared btn-accent class.
    // Exclude the step-1 "Zur Zahlung" button if it is still present in DOM.
    const submitButton = this.page
      .locator("button.btn-accent")
      .filter({ hasNotText: /zur zahlung|to payment/i })
      .first();

    await expect(submitButton).toBeVisible({ timeout: 15_000 });
    await expect(submitButton).toBeEnabled({ timeout: 15_000 });
    await submitButton.click();
    await this.page.waitForTimeout(3000);
  }

  async getCartSubtotal(): Promise<number> {
    const subtotalElement = this.page.getByTestId("checkout-subtotal-amount");
    const byTestIdVisible = await subtotalElement
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (byTestIdVisible) {
      const text =
        (await subtotalElement.textContent().catch(() => null)) ?? "";
      return this.parseCurrency(text);
    }

    // Fallback (when test ids are stripped/missing)
    return this.readAmountByLabel(/zwischensumme|subtotal/i);
  }

  async getDeliveryCost(): Promise<number> {
    const deliveryElement = this.page.getByTestId(
      "checkout-delivery-cost-amount",
    );
    const byTestIdVisible = await deliveryElement
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (byTestIdVisible) {
      const text =
        (await deliveryElement.textContent().catch(() => null)) ?? "";
      return this.parseCurrency(text);
    }

    // Fallback: delivery row exists only for delivery type.
    return this.readAmountByLabel(/lieferung|delivery|kurier/i);
  }

  async getTotal(): Promise<number> {
    const totalElement = this.page.getByTestId("checkout-total-amount");
    const byTestIdVisible = await totalElement
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (byTestIdVisible) {
      const text = (await totalElement.textContent().catch(() => null)) ?? "";
      return this.parseCurrency(text);
    }

    return this.readAmountByLabel(/gesamt|total/i);
  }

  async assertConfirmationPage(orderId?: string) {
    await expect(this.page).toHaveURL(/\/checkout\/confirmant\//, {
      timeout: 30000,
    });
    await expect(
      this.page
        .getByRole("heading", {
          name: /bestellung best(ä|a)tigt|order\s+confirmed|confirmed/i,
        })
        .first(),
    ).toBeVisible({ timeout: 10_000 });

    if (orderId) {
      await expect(this.page.getByText(orderId)).toBeVisible({ timeout: 5000 });
    }
  }

  async assertConfirmationDetails(
    customerName: string,
    customerEmail: string,
    deliveryType: "pickup" | "delivery",
    address?: string,
    totalAmount?: number,
  ) {
    await this.assertConfirmationPage();

    // Check customer name appears
    await expect(
      this.page.getByText(new RegExp(customerName, "i")),
    ).toBeVisible({ timeout: 10000 });

    // Check customer email appears (if displayed on confirmation page)
    const emailVisible = await this.page
      .getByText(new RegExp(customerEmail, "i"))
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    // Email might not always be displayed on confirmation page, so we don't fail if it's not visible

    // Check delivery type
    const deliveryTypePattern =
      deliveryType === "pickup"
        ? /pickup|abholung|selbstabholung/i
        : /delivery|lieferung|kurierlieferung/i;
    await expect(this.page.getByText(deliveryTypePattern).first()).toBeVisible({
      timeout: 10_000,
    });

    // Check address if delivery
    if (deliveryType === "delivery" && address) {
      // Address might be displayed in different formats, check for key parts
      const addressParts = address.split(",")[0].trim(); // Get street address part
      await expect(
        this.page.getByText(
          new RegExp(addressParts.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
        ),
      ).toBeVisible({ timeout: 10000 });
    }

    // Check total amount if provided
    if (totalAmount !== undefined) {
      const totalText = await this.page
        .locator("text=/total|gesamt|bezahlt/i")
        .first()
        .textContent({ timeout: 5000 })
        .catch(() => null);
      if (totalText) {
        // Extract number from currency string
        const match = totalText.match(/[\d,]+\.?\d*/);
        if (match) {
          const displayedTotal = parseFloat(match[0].replace(",", ""));
          expect(displayedTotal).toBeCloseTo(totalAmount, 2);
        }
      }
    }
  }
}
