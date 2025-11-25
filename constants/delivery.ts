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
    price: 10,
    etaDays: { min: 1, max: 2 },
  },
  {
    id: "spielberg",
    name: "Spielberg",
    price: 13,
    etaDays: { min: 1, max: 2 },
  },
  {
    id: "fohnsdorf",
    name: "Fohnsdorf",
    price: 20,
    etaDays: { min: 1, max: 3 },
  },
  {
    id: "judenburg",
    name: "Judenburg",
    price: 23,
    etaDays: { min: 1, max: 3 },
  },
  {
    id: "st-margarethen-bei-knittelfeld",
    name: "St. Margarethen bei Knittelfeld",
    price: 11,
    etaDays: { min: 1, max: 2 },
  },
  {
    id: "kobenz",
    name: "Kobenz",
    price: 12,
    etaDays: { min: 1, max: 2 },
  },
  {
    id: "kraubath-an-der-mur",
    name: "Kraubath an der Mur",
    price: 20,
    etaDays: { min: 1, max: 3 },
  },
  {
    id: "sankt-michael-in-obersteiermark",
    name: "Sankt Michael in Obersteiermark",
    price: 20,
    etaDays: { min: 1, max: 3 },
  },
  {
    id: "leoben",
    name: "Leoben",
    price: 36,
    etaDays: { min: 2, max: 4 },
  },
];

