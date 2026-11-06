// Bangladeshi mobile: 01[3-9] + 8 digits, with optional +88 / 88 prefix.
const BD_MOBILE = /^(?:\+?88)?(01[3-9]\d{8})$/;

export function normalizeBdPhone(input: string): string | null {
  const match = input.replace(/[\s-]/g, "").match(BD_MOBILE);
  return match ? `+88${match[1]}` : null;
}

export function formatBdPhone(phone: string): string {
  const local = phone.replace(/^\+88/, "");
  return `${local.slice(0, 5)}-${local.slice(5)}`;
}
