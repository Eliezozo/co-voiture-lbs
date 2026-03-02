export const ZONE_PRICES = {
  1: 2,
  2: 4,
  3: 7,
}

export function isLbsEmail(email = '') {
  return email.trim().toLowerCase().endsWith('@lomebs.com')
}
