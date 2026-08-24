// Hearing Aid Price Calculator — all patient-facing pricing data in one place.
// Source of truth: Dusty's "Hearing Aid Pricing Calculator - Data Matrix" sheet
// (completed 8/8/26). When prices change, edit this file only.

export interface Tier {
  id: string;
  name: string;
  whoFor: string;            // patient-facing one-liner
  perEarLow: number;
  perEarHigh: number;
  warrantyYears: number;
  lossAndDamage: string;
  followUpCare: string;
  rechargeable: boolean;
  bluetooth: boolean;
}

export const TIERS: Tier[] = [
  {
    id: 'premium-plus',
    name: 'Premium Plus',
    whoFor:
      'Our top-tier custom rechargeable hearing aids paired with a full 3-year service plan, for patients who want the best technology and long-term peace of mind.',
    perEarLow: 3900,
    perEarHigh: 4300,
    warrantyYears: 3,
    lossAndDamage: 'Included — $350 deductible',
    followUpCare: 'Unlimited visits for 3 years',
    rechargeable: true,
    bluetooth: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    whoFor:
      'High-performance hearing aids backed by a 3-year service plan, offering excellent sound quality and flexibility for active lifestyles.',
    perEarLow: 3400,
    perEarHigh: 3800,
    warrantyYears: 3,
    lossAndDamage: 'Included — $350 deductible',
    followUpCare: 'Unlimited visits for 3 years',
    rechargeable: true,
    bluetooth: true,
  },
  {
    id: 'economy',
    name: 'Economy',
    whoFor:
      'Quality hearing aids with a 1-year service plan, a solid choice for patients who want good everyday performance at a more affordable price.',
    perEarLow: 2400,
    perEarHigh: 2700,
    warrantyYears: 3,
    lossAndDamage: 'Included — $350 deductible',
    followUpCare: 'Unlimited visits for 1 year',
    rechargeable: true,
    bluetooth: true,
  },
  {
    id: 'essential',
    name: 'Essential',
    whoFor:
      'Basic prescription hearing aids with 3 follow-up visits — designed to give you clear, dependable hearing at our most accessible price point.',
    perEarLow: 1600,
    perEarHigh: 1800,
    warrantyYears: 2,
    lossAndDamage: 'Included — $350 deductible',
    followUpCare: '3 follow-up visits included',
    rechargeable: true,
    bluetooth: true,
  },
];

export const MEMBERSHIP = {
  id: 'hear-it-forward',
  name: 'Hear It Forward Membership',
  whoFor:
    "A membership with a low monthly fee that gives you premium hearing aids with upgrades every 3 years, expert fitting, and ongoing care and support — while also funding hearing care for someone in our community who couldn't otherwise afford it.",
  onboardingFee: 999,
  monthly: 127,
  followUpCare: 'Unlimited visits for the duration of the membership',
  lossAndDamage: 'Included — $350 deductible',
  checkoutUrl: '/give-back/hear-it-forward/',
};

// SECTION 2 — what every tier price includes (the price-defense list)
export const INCLUDED = [
  'Fitting & programming',
  'Real-ear measurement verification',
  'Follow-up & adjustment visits (per your tier’s care plan)',
  'Cleanings & maintenance',
  'Charger (or battery supply)',
  'Starter supply of domes & wax guards',
];

export const NOT_INCLUDED = {
  item: 'Hearing evaluation',
  price: '$50–$175',
  note: 'Billed separately from your hearing aid price.',
};

export const TRIAL =
  '60-day trial period — fully refundable minus $600 in fitting fees.';

// SECTION 3 — adjusters. All styles and rechargeable/disposable are the same
// price, and a pair is exactly 2× the per-ear price (no pair discount), so the
// tier IS the price. Only accessories change the total.
export const ACCESSORIES = [
  { name: 'TV streamer', price: 250 },
  { name: 'Remote microphone', price: 250 },
  { name: 'Extra / travel charger', price: 250 },
  { name: 'Custom ear plugs (per pair)', price: 150 },
];
export const ACCESSORY_NOTE = 'One accessory is included with your hearing aids.';

// SECTION 4 — flat-price services (all approved for public display)
export const SERVICES = [
  { name: 'Baseline hearing screening', price: '$50' },
  { name: 'Diagnostic hearing evaluation with treatment consultation', price: '$175' },
  { name: 'Tinnitus evaluation with treatment consultation', price: '$265' },
  { name: 'Earwax removal', price: '$65–$125' },
  { name: 'Out-of-warranty repair', price: '$350 (includes 12-month warranty)' },
  {
    name: 'Service plan for hearing aids purchased elsewhere',
    price: '$600 (audio, fitting verification & 2 follow-up visits)',
  },
  { name: 'Custom hearing protection / musician plugs', price: '$300–$400' },
];

// SECTION 5 — insurance & payment copy
export const FINANCING =
  'No-interest financing available: up to 12 months with Cherry or 15 months with Advance Care Card.';
export const INSURANCE_NOTE =
  'We are not contracted with any insurance carriers. If you have an out-of-network hearing aid benefit, you may pay in full for your treatment plan and submit the itemized receipt to your insurance carrier for reimbursement. Medicare does not provide funding for hearing aids or hearing aid services.';

// SECTION 6 — required disclaimer (Dusty's exact wording)
export const DISCLAIMER =
  'We are a cash-pay clinic. We do not participate with insurance carriers, however, those with out-of-network benefits may submit their itemized receipt to their insurance carrier for reimbursement. No-interest financing and low-monthly membership options are available.';

export const CONTACT = {
  leadEmail: 'Littleton@NewLeafHearing.com',
  bookingUrl: '/schedule-appointment/',
  phones: [
    { office: 'Arvada', display: '(303) 639-5323', tel: '3036395323' },
    { office: 'Littleton', display: '(720) 689-7989', tel: '7206897989' },
  ],
};
