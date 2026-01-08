"use client";

type RouterLike = {
  replace: (href: string) => unknown;
};

type TabId = "profile" | "orders" | "settings";

type ProfileTabsNavProps = {
  tabs: Array<{ id: TabId; label: string; hint: string }>;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  router: RouterLike;
  tabButtonId: (tabId: TabId) => string;
  tabPanelId: (tabId: TabId) => string;
  ariaLabel: string;
  palette: { softBorder: string; subtleText: string };
};

export function ProfileTabsNav({
  tabs,
  activeTab,
  setActiveTab,
  router,
  tabButtonId,
  tabPanelId,
  ariaLabel,
  palette,
}: ProfileTabsNavProps) {
  return (
    <div
      className="mt-10 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3"
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            type="button"
            role="tab"
            id={tabButtonId(tab.id)}
            key={tab.id}
            aria-selected={isActive}
            aria-controls={tabPanelId(tab.id)}
            tabIndex={isActive ? 0 : -1}
            onClick={() => {
              setActiveTab(tab.id);
              try {
                const newUrl =
                  tab.id === "profile" ? "/profile" : `/profile?tab=${tab.id}`;
                window.history.pushState({}, "", newUrl);
              } catch (_e) {
                if (tab.id === "profile") {
                  void router.replace("/profile");
                } else {
                  void router.replace(`?tab=${tab.id}`);
                }
              }
            }}
            onKeyDown={(event) => {
              if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
                return;
              }
              event.preventDefault();
              const offset = event.key === "ArrowRight" ? 1 : -1;
              const currentIndex = tabs.findIndex(
                (candidate) => candidate.id === tab.id,
              );
              if (currentIndex === -1) {
                return;
              }
              const nextIndex =
                (currentIndex + offset + tabs.length) % tabs.length;
              setActiveTab(tabs[nextIndex].id);
            }}
            className={`focus-visible:outline-accent flex flex-col rounded-3xl border bg-white px-6 py-5 text-left focus-visible:outline focus-visible:outline-offset-2 ${
              isActive
                ? "border-secondary/90"
                : `${palette.softBorder} hover:border-secondary/40`
            }`}
          >
            <span
              className={`text-xs tracking-[0.3rem] uppercase ${palette.subtleText}`}
            >
              {tab.hint}
            </span>
            <span className="text-deep text-lg font-semibold">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
