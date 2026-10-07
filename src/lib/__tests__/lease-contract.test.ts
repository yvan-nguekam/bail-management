/**
 * @jest-environment node
 */
import {
  buildLeaseContractData,
  formatContractAmount,
  formatContractDate,
  formatDurationLabel,
  leaseContractFileName,
  leaseDuration,
  slugify,
  toPdfText,
  type LeaseContractInput,
} from "@/lib/lease-contract"

const baseLease: LeaseContractInput = {
  id: "clease123",
  startDate: "2026-01-01T00:00:00.000Z",
  endDate: "2026-12-31T00:00:00.000Z",
  monthlyRent: 150000,
  securityDeposit: 300000,
  paymentDay: 5,
  terms: "Animaux interdits.\n\nEntretien du jardin à la charge du locataire.",
  property: {
    name: "Résidence Les Étoiles",
    type: "APARTMENT",
    address: "12 rue de la Paix",
    city: "Douala",
    postalCode: "BP 1234",
    country: "Cameroun",
    area: 85.5,
    bedrooms: 3,
    bathrooms: null,
    owner: { name: "Jean Dupont", email: "jean@example.com", phone: "+237 600 00 00 00" },
  },
  tenant: { name: "Marie Ngo", email: "marie@example.com", phone: null },
  payments: [
    { amount: 150000, status: "PAID" },
    { amount: 150000, status: "PENDING" },
    { amount: 150000, status: "CANCELLED" },
    { amount: 75000, status: "OVERDUE" },
  ],
}

// Every character must be printable with jsPDF's standard WinAnsi fonts
const isPdfSafe = (s: string) =>
  !/[^\n\u0020-\u007E\u00A1-\u00FF€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/u.test(s)

describe("toPdfText", () => {
  it("replaces narrow no-break and no-break spaces with plain spaces", () => {
    expect(toPdfText("150\u202F000\u00A0FCFA")).toBe("150 000 FCFA")
  })

  it("keeps French accents and WinAnsi punctuation", () => {
    expect(toPdfText("Désignation « été » çà l’œuvre – 10 €")).toBe(
      "Désignation « été » çà l’œuvre – 10 €"
    )
  })

  it("maps or replaces characters the standard fonts cannot render", () => {
    expect(toPdfText("a\u2011b \u2212 c \u{1F600} d")).toBe("a-b - c ? d")
    expect(toPdfText("ligne1\r\nligne2")).toBe("ligne1\nligne2")
  })
})

describe("formatting helpers", () => {
  it("formats FCFA amounts with plain-space thousands separators", () => {
    expect(formatContractAmount(1800000)).toBe("1 800 000 FCFA")
  })

  it("formats dates in long French form, in UTC", () => {
    expect(formatContractDate("2026-02-01T00:00:00.000Z")).toBe("1 février 2026")
    expect(formatContractDate(new Date("2026-12-31T00:00:00.000Z"))).toBe("31 décembre 2026")
  })

  it("slugifies property names", () => {
    expect(slugify("Résidence Les Étoiles (Bât. A)")).toBe("residence-les-etoiles-bat-a")
    expect(slugify("***")).toBe("bien")
  })

  it("builds the file name from the property and start date", () => {
    expect(leaseContractFileName("Villa Ô Soleil", "2026-03-01T00:00:00.000Z")).toBe(
      "contrat-bail-villa-o-soleil-2026-03-01.pdf"
    )
  })
})

describe("leaseDuration", () => {
  it("counts full months with an inclusive end date", () => {
    expect(leaseDuration("2026-01-01", "2026-12-31")).toEqual({ months: 12, days: 0 })
    expect(leaseDuration("2026-01-15", "2027-01-14")).toEqual({ months: 12, days: 0 })
  })

  it("returns remaining days for partial months", () => {
    // Jan 15 -> Feb 14 = 1 month, Feb 15 -> Mar 10 = 24 days
    expect(leaseDuration("2026-01-15", "2026-03-10")).toEqual({ months: 1, days: 24 })
    expect(leaseDuration("2026-01-01", "2026-01-10")).toEqual({ months: 0, days: 10 })
  })

  it("clamps month ends", () => {
    // Jan 31 + 1 month is clamped to Feb 28, so Jan 31 -> Feb 27 (inclusive) is one month
    expect(leaseDuration("2026-01-31", "2026-02-27")).toEqual({ months: 1, days: 0 })
    expect(leaseDuration("2026-01-31", "2026-02-26")).toEqual({ months: 0, days: 27 })
  })

  it("returns zero for invalid ranges", () => {
    expect(leaseDuration("2026-05-01", "2026-04-01")).toEqual({ months: 0, days: 0 })
  })

  it("labels durations in French", () => {
    expect(formatDurationLabel(12, 0)).toBe("12 mois")
    expect(formatDurationLabel(1, 24)).toBe("1 mois et 24 jours")
    expect(formatDurationLabel(0, 1)).toBe("1 jour")
  })
})

describe("buildLeaseContractData", () => {
  const now = new Date(2026, 9, 6, 12)
  const data = buildLeaseContractData(baseLease, now)

  it("shapes parties with fallbacks for missing contact details", () => {
    expect(data.reference).toBe("clease123")
    expect(data.landlord).toEqual({
      name: "Jean Dupont",
      email: "jean@example.com",
      phone: "+237 600 00 00 00",
    })
    expect(data.tenant.phone).toBe("Non renseigné")
    expect(data.generatedOn).toBe("6 octobre 2026")
  })

  it("describes the property", () => {
    expect(data.property).toEqual({
      name: "Résidence Les Étoiles",
      typeLabel: "Appartement",
      addressLines: ["12 rue de la Paix", "BP 1234 Douala", "Cameroun"],
      details: [
        { label: "Superficie", value: "85,5 m²" },
        { label: "Chambres", value: "3" },
      ],
    })
  })

  it("computes duration and financial terms", () => {
    expect(data.duration).toEqual({
      startDate: "1 janvier 2026",
      endDate: "31 décembre 2026",
      months: 12,
      days: 0,
      label: "12 mois",
    })
    expect(data.financial).toEqual({
      monthlyRent: "150 000 FCFA",
      paymentDay: "le 5 de chaque mois",
      securityDeposit: "300 000 FCFA",
      // Cancelled installments are excluded
      installments: { count: 3, total: "375 000 FCFA" },
    })
  })

  it("keeps terms and builds the file name", () => {
    expect(data.terms).toBe("Animaux interdits.\n\nEntretien du jardin à la charge du locataire.")
    expect(data.fileName).toBe("contrat-bail-residence-les-etoiles-2026-01-01.pdf")
  })

  it("handles a lease without schedule, terms or optional property fields", () => {
    const minimal = buildLeaseContractData(
      {
        ...baseLease,
        paymentDay: undefined,
        terms: "   ",
        payments: [],
        property: {
          ...baseLease.property,
          type: "UNKNOWN",
          postalCode: null,
          country: null,
          area: null,
          bedrooms: 0,
        },
      },
      now
    )
    expect(minimal.financial.installments).toBeNull()
    expect(minimal.financial.paymentDay).toBe("le 1er de chaque mois")
    expect(minimal.terms).toBeNull()
    expect(minimal.property.typeLabel).toBe("UNKNOWN")
    expect(minimal.property.addressLines).toEqual(["12 rue de la Paix", "Douala"])
    expect(minimal.property.details).toEqual([])
  })

  it("produces only PDF-safe characters", () => {
    const all: string[] = []
    const collect = (v: unknown) => {
      if (typeof v === "string") all.push(v)
      else if (v && typeof v === "object") Object.values(v).forEach(collect)
    }
    collect(data)
    expect(all.every(isPdfSafe)).toBe(true)
  })
})
