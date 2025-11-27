export type CourierDeliveryCity = {
  id: string;
  name: string;
  price: number;
};

export const COURIER_DELIVERY_CITIES: CourierDeliveryCity[] = [
  {
    id: "knittelfeld",
    name: "Knittelfeld",
    price: 10,
  },
  {
    id: "spielberg",
    name: "Spielberg",
    price: 13,
  },
  {
    id: "fohnsdorf",
    name: "Fohnsdorf",
    price: 20,
  },
  {
    id: "judenburg",
    name: "Judenburg",
    price: 23,
  },
  {
    id: "st-margarethen-bei-knittelfeld",
    name: "St. Margarethen bei Knittelfeld",
    price: 11,
  },
  {
    id: "kobenz",
    name: "Kobenz",
    price: 12,
  },
  {
    id: "kraubath-an-der-mur",
    name: "Kraubath an der Mur",
    price: 20,
  },
  {
    id: "sankt-michael-in-obersteiermark",
    name: "Sankt Michael in Obersteiermark",
    price: 20,
  },
  {
    id: "leoben",
    name: "Leoben",
    price: 36,
  },
];
