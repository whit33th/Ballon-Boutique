export type CourierDeliveryCity = {
  id: string;
  name: string;
  price: number;
};

export const COURIER_DELIVERY_CITIES: CourierDeliveryCity[] = [
  {
    id: "knittelfeld",
    name: "Knittelfeld",
    price: 16,
  },
  {
    id: "judenburg",
    name: "Judenburg",
    price: 22,
  },
  {
    id: "zeltweg",
    name: "Zeltweg",
    price: 20,
  },
  {
    id: "leoben",
    name: "Leoben",
    price: 28,
  },
  {
    id: "graz",
    name: "Graz",
    price: 35,
  },
];

