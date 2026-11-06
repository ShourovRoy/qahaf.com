// The bKash app menu option customers use depends on what kind of number the store has.
export const BKASH_ACCOUNT = {
  personal: { label: "Personal", menu: "Send Money" },
  agent: { label: "Agent", menu: "Cash Out" },
  merchant: { label: "Merchant", menu: "Payment" },
} as const;

export type BkashAccountType = keyof typeof BKASH_ACCOUNT;
