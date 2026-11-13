/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { InnovationType } from '../services/submitterService';

// Placeholder Botswana-relevant option lists for CEDA to confirm.

export interface InnovationSectorOption {
  id: string;
  label: string;
  subSectors: string[];
}

export interface InnovationTypeOption {
  value: InnovationType;
  label: string;
  description: string;
}

export interface TrlLevelOption {
  level: number;
  label: string;
  summary: string;
}

export interface DemographicTargetOption {
  id: string;
  label: string;
}

export const INNOVATION_SECTORS: InnovationSectorOption[] = [
  {
    id: 'agri_tech',
    label: 'Agri-Tech & Food Security',
    subSectors: [
      'Smart Irrigation & Water Tech',
      'Cold-Chain & Post-Harvest Storage',
      'Livestock & Beef Value Chain',
      'Climate-Resilient Horticulture',
      'Agro-Processing & Feed',
    ],
  },
  {
    id: 'clean_energy',
    label: 'Clean Energy & Sustainability',
    subSectors: [
      'Solar Mini-Grids & Battery Storage',
      'Biomass & Waste-to-Energy',
      'Water Purification & Recycling',
      'Industrial Energy Efficiency',
    ],
  },
  {
    id: 'fintech_digital',
    label: 'FinTech & Digital Services',
    subSectors: [
      'Digital Payments & Financial Inclusion',
      'SMME Credit & Bookkeeping Tools',
      'E-Commerce & Market Access',
      'Civic & Enterprise Software',
    ],
  },
  {
    id: 'manufacturing',
    label: 'Manufacturing & Value Addition',
    subSectors: [
      'Light Industrial & Fabrication',
      'Leather, Textiles & Apparel',
      'Sustainable Construction Materials',
      'Local Consumer Goods',
    ],
  },
  {
    id: 'healthtech',
    label: 'HealthTech & Bio-Sciences',
    subSectors: [
      'Telemedicine & Rural Health Access',
      'Diagnostics & Medical Supply',
      'Indigenous Natural Products',
    ],
  },
  {
    id: 'tourism_creative',
    label: 'Tourism & Creative Industries',
    subSectors: [
      'Eco-Tourism & Conservation Tech',
      'Cultural Heritage & Craft Commerce',
      'Digital Media & Hospitality Systems',
    ],
  },
  {
    id: 'logistics_mobility',
    label: 'Logistics & Mobility',
    subSectors: [
      'Cold-Chain Freight & Transport',
      'Last-Mile Rural Delivery',
      'Fleet & Supply Chain Software',
    ],
  },
  {
    id: 'mining_industrial',
    label: 'Mining, Minerals & Industrial Tech',
    subSectors: [
      'Mine Safety & Automation',
      'Mineral Beneficiation',
      'Environmental Monitoring',
    ],
  },
];

export const INNOVATION_TYPES: InnovationTypeOption[] = [
  {
    value: 'new_to_botswana',
    label: 'New to Botswana',
    description: 'Original product, service, or model not yet commercially offered locally.',
  },
  {
    value: 'incremental_upgrade',
    label: 'Incremental upgrade',
    description: 'Significant improvement to an existing local product, process, or service.',
  },
  {
    value: 'import_substitution',
    label: 'Import substitution',
    description: 'Locally produced alternative replacing goods or services currently imported.',
  },
];

export const TRL_LEVELS: TrlLevelOption[] = [
  {
    level: 1,
    label: 'TRL 1 — Basic principles observed',
    summary: 'Initial scientific or market principles identified; no prototype built yet.',
  },
  {
    level: 2,
    label: 'TRL 2 — Technology concept formulated',
    summary: 'Practical application and concept design defined on paper.',
  },
  {
    level: 3,
    label: 'TRL 3 — Experimental proof of concept',
    summary: 'Early laboratory or desk validation showing the concept can work.',
  },
  {
    level: 4,
    label: 'TRL 4 — Technology validated in lab',
    summary: 'Core components tested together in a controlled workshop or lab setting.',
  },
  {
    level: 5,
    label: 'TRL 5 — Validated in relevant environment',
    summary: 'Working prototype tested under realistic Botswana operating conditions.',
  },
  {
    level: 6,
    label: 'TRL 6 — Demonstrated in relevant environment',
    summary: 'Full prototype demonstrated with early pilot users or test customers.',
  },
  {
    level: 7,
    label: 'TRL 7 — Operational prototype demonstration',
    summary: 'System operating in real field conditions with active pilot deployment.',
  },
  {
    level: 8,
    label: 'TRL 8 — System complete and qualified',
    summary: 'Final commercial version tested, certified, and ready for full rollout.',
  },
  {
    level: 9,
    label: 'TRL 9 — Proven in operational environment',
    summary: 'Commercially launched product or service with active paying customers.',
  },
];

export const IP_STATUS_OPTIONS: string[] = [
  'No formal IP filed yet',
  'Proprietary trade secret or know-how',
  'CIPA trademark or industrial design pending',
  'CIPA or ARIPO patent application pending',
  'Granted patent or registered IP',
  'Open-source or licensed technology',
];

export const IMPACT_METRICS: string[] = [
  'Direct and indirect jobs created',
  'Import expenditure displaced (BWP)',
  'Annual export revenue generated (BWP)',
  'Rural households or SMMEs served',
  'Agricultural or industrial output uplift',
  'Water or energy savings achieved',
];

export const DEMOGRAPHIC_TARGETS: DemographicTargetOption[] = [
  { id: 'youth', label: 'Youth (under 35)' },
  { id: 'women', label: 'Women entrepreneurs' },
  { id: 'rural', label: 'Rural communities' },
];
