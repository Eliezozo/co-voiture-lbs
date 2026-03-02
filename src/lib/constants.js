export const ZONE_PRICING = {
  1: 2,
  2: 4,
  3: 7,
}

export const ALLOWED_EMAIL_DOMAINS = ['lbs.tg', 'lbs.edu', 'lbs.edu.tg']

export function isLbsEmail(email = '') {
  const lower = email.trim().toLowerCase()
  const [, domain = ''] = lower.split('@')
  return ALLOWED_EMAIL_DOMAINS.includes(domain)
}
