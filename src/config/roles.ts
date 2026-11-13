/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RoleConfigItem, UserRole } from '../types/auth';

/**
 * ============================================================================
 * CEDA CENTRAL ROLE CONFIGURATION REGISTRY
 * ============================================================================
 * 
 * Design Invariant:
 * Every role-based access decision, navigation menu item, authorized landing route,
 * capability assertion, and guard redirect throughout the entire CEDA Innovation Portal
 * MUST resolve dynamically through this single source of truth.
 * 
 * Rules:
 * 1. Do NOT hardcode role strings, routes, or capabilities in individual UI components.
 * 2. Self-registration is strictly locked to SUBMITTER. All internal evaluator,
 *    adjudicator, and administrative roles are appointed and provisioned via CEDA IT.
 * 3. Every role adheres to the 15-minute idle timeout with zero-trust privilege boundaries.
 */
export const ROLE_CONFIGS: Record<UserRole, RoleConfigItem> = {
  SUBMITTER: {
    role: 'SUBMITTER',
    label: 'Citizen Innovator',
    labelSetswana: 'Moitseanape wa Botswana',
    description: 'Botswana citizen entrepreneurs, youth inventors, startups and enterprises submitting novel commercial ventures.',
    landingRoute: '/dashboard',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    badgeText: 'SUBMITTER',
    capabilities: [
      'submit_innovation',
      'track_own_proposals',
      'respond_to_feedback',
      'view_grant_status',
      'manage_profile',
      'manage_active_sessions'
    ],
    navItems: [
      {
        label: 'Dashboard',
        labelSetswana: 'Botlhalo jwa me',
        path: '/dashboard',
        icon: 'grid_view'
      },
      {
        label: 'Submit an idea',
        labelSetswana: 'Romela mogopolo',
        path: '/submit',
        icon: 'lightbulb'
      },
      {
        label: 'My submissions',
        labelSetswana: 'Dikopo tsa me',
        path: '/submissions',
        icon: 'folder_open'
      },
      {
        label: 'Notifications',
        labelSetswana: 'Dikitsiso',
        path: '/notifications',
        icon: 'notifications'
      },
      {
        label: 'Profile & security',
        labelSetswana: 'Botshelo le tshireletso',
        path: '/profile',
        icon: 'shield'
      }
    ]
  },

  EVALUATOR: {
    role: 'EVALUATOR',
    label: 'Sector Specialist',
    labelSetswana: 'Mosekaseki wa Tiro',
    description: 'Accredited independent industry experts performing blinded merit reviews, technical feasibility assessments, and SLA-timed scoring.',
    landingRoute: '/dashboard/evaluator',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    badgeText: 'EVALUATOR',
    capabilities: [
      'view_blinded_queue',
      'submit_blinded_score',
      'declare_conflict_of_interest',
      'write_critique_dossier',
      'request_submitter_clarification',
      'manage_active_sessions'
    ],
    navItems: [
      {
        label: 'Evaluation Queue',
        labelSetswana: 'Lenaane la Tshekatsheko',
        path: '/dashboard/evaluator',
        icon: 'fact_check'
      },
      {
        label: 'Conflict Screener',
        labelSetswana: 'Tshireletso ya Kgolagano',
        path: '/dashboard/evaluator/conflicts',
        icon: 'gavel'
      },
      {
        label: 'Scored Dossiers',
        labelSetswana: 'Dipoloko tse di Fentseng',
        path: '/dashboard/evaluator/archive',
        icon: 'history_edu'
      },
      {
        label: 'Active Sessions',
        labelSetswana: 'Ditlhopho tsa Tshireletso',
        path: '/sessions',
        icon: 'devices'
      }
    ]
  },

  ADJUDICATOR: {
    role: 'ADJUDICATOR',
    label: 'Executive Adjudicator',
    labelSetswana: 'Moatlhodi wa Botshwantsho',
    description: 'Senior CEDA Investment Board members conducting quorum sign-offs, grant approvals, and tranche recommendations.',
    landingRoute: '/dashboard/adjudicator',
    badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
    badgeText: 'ADJUDICATOR',
    capabilities: [
      'view_adjudication_board',
      'execute_quorum_signoff',
      'approve_grant_allocation',
      'request_dual_blind_reassessment',
      'export_statutory_dossier',
      'manage_active_sessions'
    ],
    navItems: [
      {
        label: 'Board Chamber',
        labelSetswana: 'Ntlo ya Baatlhodi',
        path: '/dashboard/adjudicator',
        icon: 'assured_workload'
      },
      {
        label: 'Quorum Sign-Offs',
        labelSetswana: 'Meno a Ditumelelano',
        path: '/dashboard/adjudicator/quorum',
        icon: 'verified'
      },
      {
        label: 'Disbursement Queue',
        labelSetswana: 'Dituelo tsa Ditheetso',
        path: '/dashboard/adjudicator/disbursements',
        icon: 'payments'
      },
      {
        label: 'Active Sessions',
        labelSetswana: 'Ditlhopho tsa Tshireletso',
        path: '/sessions',
        icon: 'devices'
      }
    ]
  },

  ADMIN: {
    role: 'ADMIN',
    label: 'Portal Administrator',
    labelSetswana: 'Molaodi wa Thulaganyo',
    description: 'Parastatal system administrators managing SLA clocks, automated escalations, evaluator assignment trees, and immutable hash audit logs.',
    landingRoute: '/admin',
    badgeBg: 'bg-red-50 text-red-800 border-red-200',
    badgeText: 'ADMIN',
    capabilities: [
      'manage_users_and_roles',
      'monitor_sla_escalations',
      'inspect_immutable_audit_log',
      'override_emergency_lockouts',
      'configure_intake_cycles',
      'export_parastatal_compliance',
      'manage_active_sessions'
    ],
    navItems: [
      {
        label: 'Dashboard',
        labelSetswana: 'Tekanyetso ya Maemo',
        path: '/admin',
        icon: 'dashboard'
      },
      {
        label: 'Audit trail',
        labelSetswana: 'Kgolagano ya Tshireletso',
        path: '/admin/audit-trail',
        icon: 'history'
      },
      {
        label: 'Evaluator assignment',
        labelSetswana: 'Dithulaganyo tsa Dikomiti',
        path: '/admin/evaluator-assignment',
        icon: 'assignment_ind'
      },
      {
        label: 'Users and roles',
        labelSetswana: 'Ditsamaiso tsa Badirisi',
        path: '/admin/users',
        icon: 'group'
      },
      {
        label: 'Active Sessions',
        labelSetswana: 'Ditlhopho tsa Tshireletso',
        path: '/sessions',
        icon: 'devices'
      }
    ]
  },

  STAKEHOLDER: {
    role: 'STAKEHOLDER',
    label: 'Ecosystem Monitor',
    labelSetswana: 'Mogokaganyi wa Setshaba',
    description: 'Government stakeholders (BURS, BDIH, Ministry of Trade) reviewing macro-economic metrics, job creation indicators, and district disbursement analytics.',
    landingRoute: '/dashboard/stakeholder',
    badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
    badgeText: 'STAKEHOLDER',
    capabilities: [
      'view_national_macro_dashboard',
      'inspect_district_dispersal',
      'track_youth_female_inclusion',
      'generate_cabinet_briefings',
      'manage_active_sessions'
    ],
    navItems: [
      {
        label: 'Macro Monitoring',
        labelSetswana: 'Tekanyetso ya Setshaba',
        path: '/dashboard/stakeholder',
        icon: 'monitoring'
      },
      {
        label: 'District Dispersal',
        labelSetswana: 'Kgolagano ya Dikgaolo',
        path: '/dashboard/stakeholder/districts',
        icon: 'map'
      },
      {
        label: 'Economic Inclusion (EIA)',
        labelSetswana: 'Tsamaiso ya Ditiro',
        path: '/dashboard/stakeholder/impact',
        icon: 'pie_chart'
      },
      {
        label: 'Active Sessions',
        labelSetswana: 'Ditlhopho tsa Tshireletso',
        path: '/sessions',
        icon: 'devices'
      }
    ]
  }
};

/**
 * Helper to safely resolve landing route from role
 */
export function getLandingRouteForRole(role: UserRole): string {
  const config = ROLE_CONFIGS[role];
  return config ? config.landingRoute : '/dashboard';
}

/**
 * Check if a role possesses a specific capability
 */
export function hasRoleCapability(role: UserRole, capability: string): boolean {
  const config = ROLE_CONFIGS[role];
  return Boolean(config && config.capabilities.includes(capability));
}
