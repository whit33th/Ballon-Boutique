import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class AdminPage extends BasePage {
  async gotoAdmin() {
    await this.page.goto("/admin");
    await expect(this.page.getByTestId("admin-dashboard")).toBeVisible({
      timeout: 20_000,
    });
  }

  async switchToProductsTab() {
    const productsTab = this.page
      .getByRole("tab", { name: /products|produkte/i })
      .or(this.page.locator('[data-testid="admin-tab-products"]'));
    if (await productsTab.isVisible({ timeout: 5000 })) {
      await productsTab.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async switchToOrdersTab() {
    const ordersTab = this.page
      .getByRole("tab", { name: /orders|bestellungen/i })
      .or(this.page.locator('[data-testid="admin-tab-orders"]'));
    if (await ordersTab.isVisible({ timeout: 5000 })) {
      await ordersTab.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async openCreateProductForm() {
    const createButton = this.page
      .getByRole("button", { name: /create|add|new|produkt|erstellen/i })
      .first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async fillProductForm(product: {
    name: string;
    description: string;
    price: string;
    categoryGroup: string;
    categories: string[];
    inStock: boolean;
    miniSetSizes?: Array<{ label: string; price: string }>;
    isPersonalizable?: { name: boolean; number: boolean };
    availableColors?: string[];
  }) {
    // Fill basic fields
    await this.page
      .getByRole("textbox", { name: /^name$|^produktname$/i })
      .first()
      .fill(product.name);
    await this.page
      .getByRole("textbox", { name: /^description$|^beschreibung$/i })
      .first()
      .fill(product.description);

    const priceInput = this.page
      .locator('input[name="price"]')
      .or(this.page.getByRole("spinbutton", { name: /^price$|^preis$/i }))
      .or(this.page.getByRole("textbox", { name: /^price$|^preis$/i }))
      .first();
    await expect(priceInput).toBeVisible({ timeout: 10_000 });
    await priceInput.fill(product.price);

    // Select category group
    const categoryGroupSelect = this.page
      .locator('select[name="categoryGroup"]')
      .or(
        this.page.getByRole("combobox", {
          name: /category.*group|kategorie.*gruppe/i,
        }),
      )
      .first();
    if (await categoryGroupSelect.isVisible({ timeout: 3000 })) {
      await categoryGroupSelect.selectOption(product.categoryGroup);
      await this.page.waitForTimeout(500);
    }

    // Select categories (if multiple)
    for (const category of product.categories) {
      const categoryCheckbox = this.page
        .getByRole("checkbox", { name: new RegExp(category, "i") })
        .or(this.page.locator(`[value="${category}"]`))
        .first();
      if (await categoryCheckbox.isVisible({ timeout: 2000 })) {
        await categoryCheckbox.check();
        await this.page.waitForTimeout(300);
      }
    }

    // Set stock status
    const inStockCheckbox = this.page
      .getByLabel(/in stock|available|lagernd/i)
      .or(this.page.locator('input[type="checkbox"][name="inStock"]'))
      .first();
    if (await inStockCheckbox.isVisible({ timeout: 3000 })) {
      if (product.inStock) {
        await inStockCheckbox.check();
      } else {
        await inStockCheckbox.uncheck();
      }
      await this.page.waitForTimeout(300);
    }

    // Fill mini set sizes if provided
    if (product.miniSetSizes && product.miniSetSizes.length > 0) {
      // This would require more complex form interaction
      // For now, just verify the field exists
      const sizesSection = this.page.getByText(/size|größe/i).first();
      if (await sizesSection.isVisible({ timeout: 3000 })) {
        // Add sizes logic here if needed
      }
    }

    // Set personalization options
    if (product.isPersonalizable) {
      if (product.isPersonalizable.name) {
        const nameCheckbox = this.page
          .getByLabel(/personalizable.*name|custom.*text/i)
          .first();
        if (await nameCheckbox.isVisible({ timeout: 2000 })) {
          await nameCheckbox.check();
          await this.page.waitForTimeout(300);
        }
      }
      if (product.isPersonalizable.number) {
        const numberCheckbox = this.page
          .getByLabel(/personalizable.*number|custom.*number/i)
          .first();
        if (await numberCheckbox.isVisible({ timeout: 2000 })) {
          await numberCheckbox.check();
          await this.page.waitForTimeout(300);
        }
      }
    }
  }

  async saveProduct() {
    const saveButton = this.page
      .getByRole("button", { name: /save|speichern|create|erstellen/i })
      .first();
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await saveButton.click();
    await this.page.waitForTimeout(2000);

    // Wait for success message
    await expect(
      this.page.getByText(/saved|created|success|gespeichert|erstellt/i),
    ).toBeVisible({ timeout: 10000 });
  }

  async editProduct(productName: string) {
    const productCard = this.page.getByText(productName).first();
    if (await productCard.isVisible({ timeout: 5000 })) {
      // Click edit button near the product
      const editButton = productCard
        .locator("..")
        .getByRole("button", { name: /edit|bearbeiten/i })
        .or(
          this.page
            .locator(`[data-product-name="${productName}"]`)
            .getByRole("button", { name: /edit/i }),
        )
        .first();

      if (await editButton.isVisible({ timeout: 3000 })) {
        await editButton.click();
        await this.page.waitForTimeout(1000);
      } else {
        // Fallback: click on product card itself
        await productCard.click();
        await this.page.waitForTimeout(1000);
      }
    }
  }

  async deleteProduct(productName: string) {
    const productCard = this.page.getByText(productName).first();
    if (await productCard.isVisible({ timeout: 5000 })) {
      const deleteButton = productCard
        .locator("..")
        .getByRole("button", { name: /delete|löschen/i })
        .or(
          this.page
            .locator(`[data-product-name="${productName}"]`)
            .getByRole("button", { name: /delete/i }),
        )
        .first();

      if (await deleteButton.isVisible({ timeout: 3000 })) {
        await deleteButton.click();
        await this.page.waitForTimeout(500);

        // Confirm deletion
        const confirmButton = this.page
          .getByRole("button", { name: /confirm|yes|ja|delete/i })
          .last();
        if (await confirmButton.isVisible({ timeout: 3000 })) {
          await confirmButton.click();
          await this.page.waitForTimeout(2000);

          // Wait for success message
          await expect(
            this.page.getByText(/deleted|removed|gelöscht|entfernt/i),
          ).toBeVisible({ timeout: 10000 });
        }
      }
    }
  }

  async searchProducts(query: string) {
    const searchInput = this.page
      .getByPlaceholder(/search|suchen/i)
      .or(this.page.locator('input[type="search"]'))
      .first();
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill(query);
      await this.page.waitForTimeout(1000);
    }
  }

  async filterProductsByAvailability(
    availability: "all" | "inStock" | "outOfStock",
  ) {
    const filterButton = this.page
      .getByRole("button", { name: /filter|filtern/i })
      .or(this.page.locator('[data-testid="admin-filter-availability"]'))
      .first();

    if (await filterButton.isVisible({ timeout: 3000 })) {
      await filterButton.click();
      await this.page.waitForTimeout(500);

      const option = this.page
        .getByRole("option", { name: new RegExp(availability, "i") })
        .or(this.page.locator(`[value="${availability}"]`))
        .first();

      if (await option.isVisible({ timeout: 2000 })) {
        await option.click();
        await this.page.waitForTimeout(1000);
      }
    }
  }

  async filterProductsByCategory(category: string) {
    const filterButton = this.page
      .getByRole("button", { name: /category|kategorie/i })
      .or(this.page.locator('[data-testid="admin-filter-category"]'))
      .first();

    if (await filterButton.isVisible({ timeout: 3000 })) {
      await filterButton.click();
      await this.page.waitForTimeout(500);

      const option = this.page
        .getByRole("option", { name: new RegExp(category, "i") })
        .or(this.page.locator(`[value="${category}"]`))
        .first();

      if (await option.isVisible({ timeout: 2000 })) {
        await option.click();
        await this.page.waitForTimeout(1000);
      }
    }
  }

  async searchOrders(query: string) {
    const searchInput = this.page
      .getByPlaceholder(/search.*order|suchen.*bestellung/i)
      .or(this.page.locator('input[type="search"]'))
      .first();
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill(query);
      await this.page.waitForTimeout(1000);
    }
  }

  async filterOrdersByStatus(
    status:
      | "all"
      | "pending"
      | "confirmed"
      | "shipped"
      | "delivered"
      | "canceled",
  ) {
    const filterButton = this.page
      .getByRole("button", { name: /status/i })
      .or(this.page.locator('[data-testid="admin-filter-status"]'))
      .first();

    if (await filterButton.isVisible({ timeout: 3000 })) {
      await filterButton.click();
      await this.page.waitForTimeout(500);

      const option = this.page
        .getByRole("option", { name: new RegExp(status, "i") })
        .or(this.page.locator(`[value="${status}"]`))
        .first();

      if (await option.isVisible({ timeout: 2000 })) {
        await option.click();
        await this.page.waitForTimeout(1000);
      }
    }
  }

  async viewOrder(orderId: string) {
    const tableRow = this.page
      .locator("table tbody tr")
      .filter({ hasText: orderId })
      .first();

    if (await tableRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tableRow.click();
      await this.page.waitForTimeout(1000);
      return;
    }

    const fallback = this.page.getByText(orderId).first();
    if (await fallback.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fallback.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async updateOrderStatus(orderId: string, newStatus: string) {
    await this.viewOrder(orderId);

    const statusSelect = this.page
      .locator('select[name="status"]')
      .or(this.page.getByRole("combobox", { name: /status/i }))
      .first();

    if (await statusSelect.isVisible({ timeout: 5000 })) {
      await statusSelect.selectOption(newStatus);
      await this.page.waitForTimeout(1000);

      // Save changes
      const saveButton = this.page
        .getByRole("button", { name: /save|update|speichern/i })
        .first();
      if (await saveButton.isVisible({ timeout: 3000 })) {
        await saveButton.click();
        await this.page.waitForTimeout(2000);

        // Wait for success message
        await expect(
          this.page.getByText(/updated|saved|success|aktualisiert/i),
        ).toBeVisible({ timeout: 10000 });
      }
    }
  }
}
