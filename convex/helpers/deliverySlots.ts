import { STORE_INFO } from "../../constants/config";
import type { Doc, Id } from "../_generated/dataModel";
import type { DatabaseReader } from "../_generated/server";

export type DeliverySlot = {
  /** Minutes from midnight in store timezone */
  minutes: number;
  /** Display label like "16:30" */
  label: string;
  /** UTC ISO string representing that local slot time */
  iso: string;
  available: boolean;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

const parseDateInput = (
  value: string,
): { y: number; m: number; d: number } | null => {
  const trimmed = (value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [y, m, d] = trimmed.split("-").map((p) => Number(p));
  if (!y || !m || !d) return null;
  return { y, m, d };
};

const getTimeZoneOffsetMs = (date: Date, timeZone: string): number => {
  // Returns (asUTC - date) in ms for the given timezone.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }

  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );

  return asUTC - date.getTime();
};

const zonedDateTimeToUtcIso = (args: {
  y: number;
  m: number;
  d: number;
  hour: number;
  minute: number;
  timeZone: string;
}): string => {
  const naiveUtc = new Date(
    Date.UTC(args.y, args.m - 1, args.d, args.hour, args.minute, 0, 0),
  );
  const offsetMs = getTimeZoneOffsetMs(naiveUtc, args.timeZone);
  const utc = new Date(naiveUtc.getTime() - offsetMs);
  return utc.toISOString();
};

export const getDeliveryWindowMinutes = (): {
  startMinutes: number;
  endMinutes: number;
  slotMinutes: number;
  bufferMinutes: number;
  timeZone: string;
} => {
  const startMinutes =
    STORE_INFO.delivery.minDeliveryHour * 60 +
    (STORE_INFO.delivery.minDeliveryMinute ?? 0);
  const endMinutes =
    STORE_INFO.delivery.maxDeliveryHour * 60 +
    (STORE_INFO.delivery.maxDeliveryMinute ?? 0);
  const slotMinutes = STORE_INFO.delivery.slotMinutes ?? 30;
  const bufferMinutes = STORE_INFO.delivery.slotBufferMinutes ?? 90;
  const timeZone = STORE_INFO.geo.timezone;
  return { startMinutes, endMinutes, slotMinutes, bufferMinutes, timeZone };
};

export const buildDeliverySlotsForDate = (
  date: string,
): Array<Omit<DeliverySlot, "available">> => {
  const parsed = parseDateInput(date);
  if (!parsed) return [];

  const { startMinutes, endMinutes, slotMinutes, timeZone } =
    getDeliveryWindowMinutes();

  const slots: Array<Omit<DeliverySlot, "available">> = [];
  for (
    let minutes = startMinutes;
    minutes + slotMinutes <= endMinutes;
    minutes += slotMinutes
  ) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const label = `${pad2(hour)}:${pad2(minute)}`;
    const iso = zonedDateTimeToUtcIso({
      y: parsed.y,
      m: parsed.m,
      d: parsed.d,
      hour,
      minute,
      timeZone,
    });
    slots.push({ minutes, label, iso });
  }

  return slots;
};

export const markDeliverySlotAvailability = (args: {
  slots: Array<Omit<DeliverySlot, "available">>;
  existingDeliveryOrderIsos: string[];
}): DeliverySlot[] => {
  const { bufferMinutes } = getDeliveryWindowMinutes();
  const bufferMs = bufferMinutes * 60 * 1000;
  const nowMs = Date.now();

  const existingTimes = args.existingDeliveryOrderIsos
    .map((iso) => new Date(iso))
    .map((d) => d.getTime())
    .filter((ms) => Number.isFinite(ms));

  return args.slots.map((slot) => {
    const slotMs = new Date(slot.iso).getTime();
    const notInPast = Number.isFinite(slotMs) ? slotMs >= nowMs : false;
    const notConflicting = existingTimes.every(
      (existingMs) => Math.abs(existingMs - slotMs) > bufferMs,
    );
    const available = notInPast && notConflicting;
    return { ...slot, available };
  });
};

const formatDateInTimeZone = (iso: string, timeZone: string): string | null => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // en-CA yields YYYY-MM-DD
  return dtf.format(date);
};

export const assertDeliverySlotIsValidAndAvailable = async (args: {
  db: DatabaseReader;
  slotIso: string;
  ignoreOrderId?: Id<"orders">;
}): Promise<void> => {
  const { timeZone } = getDeliveryWindowMinutes();
  const dateStr = formatDateInTimeZone(args.slotIso, timeZone);
  if (!dateStr) {
    throw new Error("Invalid delivery slot");
  }

  const slots = buildDeliverySlotsForDate(dateStr);
  const matchesWindow = slots.some((s) => s.iso === args.slotIso);
  if (!matchesWindow) {
    throw new Error("Selected delivery slot is outside working hours");
  }

  const recentOrders: Doc<"orders">[] = await args.db
    .query("orders")
    .order("desc")
    .take(500);
  const existingDeliveryIsos = recentOrders
    .filter((o: Doc<"orders">) =>
      args.ignoreOrderId ? o._id !== args.ignoreOrderId : true,
    )
    .filter((o: Doc<"orders">) => (o.deliveryType ?? "pickup") === "delivery")
    .map((o: Doc<"orders">) => o.pickupDateTime)
    .filter(
      (iso: string | undefined): iso is string =>
        typeof iso === "string" && iso.length > 0,
    );

  const marked = markDeliverySlotAvailability({
    slots,
    existingDeliveryOrderIsos: existingDeliveryIsos,
  });

  const selected = marked.find((s) => s.iso === args.slotIso);
  if (!selected) {
    throw new Error("Selected delivery slot is invalid");
  }
  if (!selected.available) {
    throw new Error("Selected delivery slot is no longer available");
  }
};
