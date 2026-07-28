/**
 * Curated official insurer network-hospital locators (D-025).
 * Not a cashless verification API — opens the insurer’s own tool.
 */

export type InsurerNetworkEntry = {
  id: string;
  canonicalName: string;
  /** Lowercase substrings / aliases for fuzzy match against free-text `policies.insurer`. */
  aliases: string[];
  networkHospitalsUrl: string;
  helpline?: string;
};

export const INSURER_NETWORK_CATALOG: InsurerNetworkEntry[] = [
  {
    id: 'star-health',
    canonicalName: 'Star Health',
    aliases: ['star health', 'starhealth', 'star health and allied'],
    networkHospitalsUrl: 'https://www.starhealth.in/lookup/hospital/',
    helpline: '1800-425-2255',
  },
  {
    id: 'hdfc-ergo',
    canonicalName: 'HDFC ERGO',
    aliases: ['hdfc ergo', 'hdfcergo', 'hdfc health'],
    networkHospitalsUrl: 'https://www.hdfcergo.com/locators/cashless-hospitals-networks',
    helpline: '022-6234-6234',
  },
  {
    id: 'icici-lombard',
    canonicalName: 'ICICI Lombard',
    aliases: ['icici lombard', 'icicilombard', 'ilhc'],
    networkHospitalsUrl: 'https://www.icicilombard.com/cashless-hospitals',
    helpline: '1800-2666',
  },
  {
    id: 'care-health',
    canonicalName: 'Care Health',
    aliases: ['care health', 'care insurance', 'religare', 'care health insurance'],
    networkHospitalsUrl: 'https://www.careinsurance.com/health-insurance/hospital-cashless-network',
    helpline: '1800-102-4488',
  },
  {
    id: 'niva-bupa',
    canonicalName: 'Niva Bupa',
    aliases: ['niva bupa', 'nivabupa', 'max bupa', 'maxbupa'],
    networkHospitalsUrl: 'https://www.nivabupa.com/locate-hospital.html',
    helpline: '1860-500-8888',
  },
  {
    id: 'bajaj-allianz',
    canonicalName: 'Bajaj Allianz',
    aliases: ['bajaj allianz', 'bajajallianz', 'bajaj health'],
    networkHospitalsUrl: 'https://www.bajajallianz.com/branch-locator.html',
    helpline: '1800-209-5858',
  },
  {
    id: 'aditya-birla',
    canonicalName: 'Aditya Birla Health',
    aliases: ['aditya birla', 'adityabirla', 'activ health', 'birla health'],
    networkHospitalsUrl: 'https://www.adityabirlacapital.com/healthinsurance/homepage/network-hospitals',
    helpline: '1800-270-7000',
  },
  {
    id: 'manipalcigna',
    canonicalName: 'ManipalCigna',
    aliases: ['manipalcigna', 'manipal cigna', 'cigna ttk'],
    networkHospitalsUrl: 'https://www.manipalcigna.com/network-hospitals',
    helpline: '1800-102-4462',
  },
  {
    id: 'tata-aig',
    canonicalName: 'Tata AIG',
    aliases: ['tata aig', 'tataaig'],
    networkHospitalsUrl: 'https://www.tataaig.com/health-insurance/network-hospitals',
    helpline: '1800-266-7780',
  },
  {
    id: 'new-india',
    canonicalName: 'New India Assurance',
    aliases: ['new india', 'newindia', 'new india assurance'],
    networkHospitalsUrl: 'https://www.newindia.co.in/portal/showNetworkHospital',
    helpline: '1800-209-1415',
  },
  {
    id: 'sbi-general',
    canonicalName: 'SBI General',
    aliases: ['sbi general', 'sbigeneral', 'sbi health'],
    networkHospitalsUrl: 'https://www.sbigeneral.in/claim/hospital-locator',
    helpline: '1800-22-1111',
  },
  {
    id: 'reliance-general',
    canonicalName: 'Reliance General',
    aliases: ['reliance general', 'reliance health', 'reliance general insurance'],
    networkHospitalsUrl: 'https://www.reliancegeneral.co.in/Insurance/Health-Insurance/Network-Hospital.aspx',
    helpline: '022-4890-3009',
  },
];

function normalizeInsurerText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Best catalog match for free-text insurer name, or null if unmatched. */
export function matchInsurerNetwork(insurerText: string): InsurerNetworkEntry | null {
  const normalized = normalizeInsurerText(insurerText);
  if (!normalized) {
    return null;
  }

  let best: { entry: InsurerNetworkEntry; score: number } | null = null;

  for (const entry of INSURER_NETWORK_CATALOG) {
    const names = [entry.canonicalName, ...entry.aliases].map(normalizeInsurerText);
    for (const alias of names) {
      if (!alias) {
        continue;
      }
      let score = 0;
      if (normalized === alias) {
        score = 100;
      } else if (normalized.includes(alias) || alias.includes(normalized)) {
        score = 80 + Math.min(alias.length, 19);
      } else {
        const parts = alias.split(' ').filter((p) => p.length > 2);
        const hit = parts.filter((p) => normalized.includes(p)).length;
        if (hit > 0 && hit === parts.length) {
          score = 60 + hit;
        } else if (hit >= 2) {
          score = 40 + hit;
        }
      }
      if (score > 0 && (!best || score > best.score)) {
        best = { entry, score };
      }
    }
  }

  return best && best.score >= 40 ? best.entry : null;
}

export type PolicyCashlessLink = {
  policyId: string;
  policyLabel: string;
  insurerText: string;
  entry: InsurerNetworkEntry | null;
};

export function buildPolicyCashlessLinks(
  policies: { id: string; insurer: string; policy_number?: string | null }[]
): PolicyCashlessLink[] {
  return policies.map((policy) => {
    const insurerText = policy.insurer.trim();
    const entry = matchInsurerNetwork(insurerText);
    return {
      policyId: policy.id,
      policyLabel: insurerText || 'Policy',
      insurerText,
      entry,
    };
  });
}

export const CASHLESS_ASSIST_DISCLAIMER =
  'Opens your insurer’s official network tool. HealthShield does not verify cashless empanelment — confirm with the insurer or hospital TPA desk before admission.';
