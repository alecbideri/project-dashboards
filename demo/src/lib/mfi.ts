// Member context for the MFI / SACCO workspace. The SACCO already knows these
// people: they are members with savings, tenure and prior loans. This is the
// "brings its own distribution" layer the engine cannot see.

export interface MemberContext {
  memberSince: string
  savingsBalance: number
  priorLoans: number
  onTimeRate: number // percent of prior loans repaid on time
  fieldOfficerNote: string
}

export const memberContext: Record<string, MemberContext> = {
  trader: {
    memberSince: "2022",
    savingsBalance: 340_000,
    priorLoans: 2,
    onTimeRate: 100,
    fieldOfficerNote: "Known member for four years. Runs the stall with his brother; repaid two prior loans early.",
  },
  baker: {
    memberSince: "2023",
    savingsBalance: 210_000,
    priorLoans: 1,
    onTimeRate: 100,
    fieldOfficerNote: "Field visit confirmed the oven and the bulk contract with the school. Reliable on her one prior loan.",
  },
  salon: {
    memberSince: "2021",
    savingsBalance: 150_000,
    priorLoans: 3,
    onTimeRate: 100,
    fieldOfficerNote: "Long-standing member, salon is the family income. Three prior loans, all repaid.",
  },
  poultry: {
    memberSince: "2024",
    savingsBalance: 95_000,
    priorLoans: 0,
    onTimeRate: 0,
    fieldOfficerNote: "New member. Visit confirmed the coop and feed stock; no prior borrowing history yet.",
  },
  transporter: {
    memberSince: "2023",
    savingsBalance: 280_000,
    priorLoans: 2,
    onTimeRate: 100,
    fieldOfficerNote: "Added a second bike last year; the first is fully owned. Strong rider reputation in Remera.",
  },
  tailor: {
    memberSince: "2022",
    savingsBalance: 120_000,
    priorLoans: 1,
    onTimeRate: 100,
    fieldOfficerNote: "School uniform contracts verified on site. Repaid his prior loan on schedule.",
  },
  shop: {
    memberSince: "2023",
    savingsBalance: 80_000,
    priorLoans: 1,
    onTimeRate: 67,
    fieldOfficerNote: "One prior loan late by a week during the low season. Shop is busy; tourist peak helps.",
  },
  farmer: {
    memberSince: "2021",
    savingsBalance: 60_000,
    priorLoans: 2,
    onTimeRate: 50,
    fieldOfficerNote: "Repays at harvest, struggles between seasons. Co-op membership helps; visit confirms maize plot.",
  },
  "farm-cosign": {
    memberSince: "2022",
    savingsBalance: 130_000,
    priorLoans: 1,
    onTimeRate: 100,
    fieldOfficerNote: "Has a co-signer in the group. Cassava plot verified; harvest is the single income window.",
  },
  overleveraged: {
    memberSince: "2023",
    savingsBalance: 45_000,
    priorLoans: 2,
    onTimeRate: 50,
    fieldOfficerNote: "Two open consumer loans show on the ledger. Salon does well but existing debt is heavy.",
  },
  vendor: {
    memberSince: "2024",
    savingsBalance: 20_000,
    priorLoans: 0,
    onTimeRate: 0,
    fieldOfficerNote: "Recent member, thin savings. Market sales have been falling; no prior loan to judge.",
  },
  edge: {
    memberSince: "2024",
    savingsBalance: 15_000,
    priorLoans: 1,
    onTimeRate: 0,
    fieldOfficerNote: "One prior loan defaulted. Personal withdrawals from the business ledger are a concern.",
  },
}
