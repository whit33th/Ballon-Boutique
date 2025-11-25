const currencyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

export const formatCurrency = (value: number) =>
  currencyFormatter.format(value);

const currencyFormatters = new Map<string, Intl.NumberFormat>();

export const formatCurrencyDynamic = (value: number, currency?: string) => {
  const code = (currency ?? "EUR").toUpperCase();
  let formatter = currencyFormatters.get(code);
  if (!formatter) {
    formatter = new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
    });
    currencyFormatters.set(code, formatter);
  }

  return formatter.format(value);
};

export const formatDateTime = (timestamp: number) =>
  new Date(timestamp).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
