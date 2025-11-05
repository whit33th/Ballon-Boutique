import { Globe, Heart, Leaf } from "lucide-react";

export const Quality = () => {
  const qualityItems = [
    {
      icon: Leaf,
      title: "Natural",
      subtitle: "Materials",
      shape: "square",
      color: "beige",
    },
    {
      icon: Globe,
      title: "Eco",
      subtitle: "Safe",
      shape: "rounded",
      color: "green",
    },
    {
      icon: Heart,
      title: "Premium",
      subtitle: "Quality",
      shape: "square",
      color: "beige",
    },
  ];

  return (
    <section className="relative overflow-hidden">
      <div className="relative z-10 mx-auto p-4 py-10">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {qualityItems.map((item) => {
            const Icon = item.icon;
            const isSquare = item.shape === "square";
            const isBeige = item.color === "beige";

            return (
              <div
                key={item.title}
                className={`flex items-center justify-center border border-gray-200/50 p-4 backdrop-blur-sm ${
                  isSquare
                    ? "rounded-lg bg-amber-50/80"
                    : "rounded-full bg-white/80"
                }`}
              >
                <div
                  className={`mr-3 flex h-8 w-8 items-center justify-center rounded-full ${
                    isBeige
                      ? "bg-linear-to-br from-amber-50 to-amber-100 text-amber-600"
                      : "bg-linear-to-br from-green-50 to-green-100 text-green-600"
                  }`}
                >
                  <Icon size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-800 italic">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-600">{item.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
