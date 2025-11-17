export type CourierDeliveryCity = {
  id: string;
  name: string;
  price: number;
  etaDays: {
    min: number;
    max: number;
  };
};

export const COURIER_DELIVERY_CITIES: CourierDeliveryCity[] = [
  {
    id: "knittelfeld",
    name: "Knittelfeld",
    price: 16,
    etaDays: { min: 1, max: 2 },
  },
  {
    id: "judenburg",
    name: "Judenburg",
    price: 22,
    etaDays: { min: 1, max: 3 },
  },
  {
    id: "zeltweg",
    name: "Zeltweg",
    price: 20,
    etaDays: { min: 1, max: 3 },
  },
  {
    id: "leoben",
    name: "Leoben",
    price: 28,
    etaDays: { min: 2, max: 4 },
  },
  {
    id: "graz",
    name: "Graz",
    price: 35,
    etaDays: { min: 2, max: 5 },
  },
];

