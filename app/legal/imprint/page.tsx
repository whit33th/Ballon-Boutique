import { STORE_INFO } from "@/constants/config";

const sections = [
  {
    heading: "Responsible for content",
    items: [
      STORE_INFO.legal.companyName,
      `Owner: ${STORE_INFO.legal.owner}`,
      STORE_INFO.address.street,
      `${STORE_INFO.address.postalCode} ${STORE_INFO.address.city}`,
      STORE_INFO.address.country,
    ],
  },
  {
    heading: "Contact",
    items: [
      STORE_INFO.contact.email,
      STORE_INFO.contact.phoneDisplay ?? STORE_INFO.contact.phone,
    ],
  },
  {
    heading: "Registration details",
    items: [
      `Company register number: ${STORE_INFO.legal.registrationNumber}`,
      `VAT ID: ${STORE_INFO.legal.vatNumber}`,
      STORE_INFO.legal.chamberMembership,
      `Supervisory authority: ${STORE_INFO.legal.supervisoryAuthority}`,
      `Trade authority: ${STORE_INFO.legal.tradeAuthority}`,
      STORE_INFO.legal.professionalRegulation,
    ],
  },
];

export default function ImprintPage() {
  return (
    <main className="bg-primary/20 text-deep min-h-screen px-6 py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 rounded-3xl bg-white/95 p-8 shadow-xl">
        <header className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] text-[rgba(var(--deep-rgb),0.6)] uppercase">
            Legal disclosure (Impressum)
          </p>
          <h1 className="text-deep text-3xl font-semibold tracking-tight">
            Imprint in accordance with Austrian ECG and MedienG
          </h1>
          <p className="text-sm leading-relaxed text-[rgba(var(--deep-rgb),0.75)]">
            This information fulfils the legal disclosure obligations for online
            merchants in Austria under the E-Commerce Act (ECG), Media Act
            (MedienG) and the Trade Regulation Act (GewO).
          </p>
        </header>

        <section className="grid gap-8 md:grid-cols-2">
          {sections.map((section) => (
            <div key={section.heading}>
              <h2 className="text-sm font-semibold tracking-[0.18em] text-[rgba(var(--deep-rgb),0.6)] uppercase">
                {section.heading}
              </h2>
              <ul className="mt-3 space-y-1.5 text-sm text-[rgba(var(--deep-rgb),0.85)]">
                {section.items.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="space-y-4 text-sm text-[rgba(var(--deep-rgb),0.8)]">
          <div>
            <h2 className="text-sm font-semibold tracking-[0.18em] text-[rgba(var(--deep-rgb),0.6)] uppercase">
              EU dispute resolution platform
            </h2>
            <p className="mt-2">
              Consumers may submit complaints to the EU online dispute
              resolution platform:
              <a
                href={STORE_INFO.legal.euDisputeResolutionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-secondary ml-2 underline"
              >
                {STORE_INFO.legal.euDisputeResolutionUrl}
              </a>
              . We are neither obliged nor willing to participate in dispute
              resolution proceedings before a consumer arbitration board, yet we
              always aim to resolve matters directly with our customers.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-[0.18em] text-[rgba(var(--deep-rgb),0.6)] uppercase">
              Content liability
            </h2>
            <p>
              We constantly review and update the information on this website.
              Nevertheless, no liability is assumed for any errors, omissions or
              outdated content. Obligations to remove or block the use of
              information under general laws remain unaffected (Sections 18 and
              21 ECG). Liability is only possible from the time of knowledge of
              a specific infringement. Upon notification, unlawful content will
              be removed without delay.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-[0.18em] text-[rgba(var(--deep-rgb),0.6)] uppercase">
              Links and intellectual property
            </h2>
            <p>
              Our website contains links to external websites over which we have
              no control. We therefore assume no responsibility for these
              external contents. The copyright for all images, graphics and
              texts remains with Ballon Boutique unless stated otherwise. Use
              beyond personal consultation requires prior written consent.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
