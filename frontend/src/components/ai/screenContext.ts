/**
 * Per-screen AI context — seed messages, suggestions, people, quick-actions.
 * Consumed by AIPanel to make every tab feel live and scoped.
 */
import type { ScreenId } from '@/types'

export interface PersonEntry {
  name: string
  role: string
  territory: string
  activity: string
  online: boolean
}

export interface AIScreenCtx {
  seedMessage: string
  suggestions: string[]
  people: PersonEntry[]
  kpiHighlights: { label: string; value: string; delta: string; breach: boolean }[]
  warRoomActions: { label: string; key: string; tone?: 'red' | 'amber' | 'normal' }[]
  fieldActions: string[]
}

export const SCREEN_AI_CTX: Record<ScreenId, AIScreenCtx> = {
  'S-00': {
    seedMessage: '187.4 Cr net sales MTD · Sales vs Target at 68% (breach) · 23 active drifts. Where do you want to dig in?',
    suggestions: [
      'Why is Sales vs Target breached?',
      'Which region is driving the Sec:Pri gap?',
      'Show me the top 3 critical drifts',
      'Summarise this week for my ZSM call',
    ],
    people: [
      { name: 'B. Kant',      role: 'RSM',  territory: 'North-2',   activity: 'reviewed DA-03',     online: true  },
      { name: 'M. Verma',     role: 'ASM',  territory: 'Faizabad',  activity: 'field visit Oct 12', online: true  },
      { name: 'A. Srivastav', role: 'ASM',  territory: 'Varanasi',  activity: '',                   online: true  },
      { name: 'P. Yadav',     role: 'ASM',  territory: 'Kanpur',    activity: 'SO-GONDA audit',     online: true  },
      { name: 'R. Pandit',    role: 'SR',   territory: 'Rachit Pandit', activity: 'billing call',   online: false },
      { name: 'E. Varkey',    role: 'SR',   territory: 'Ekapad Varkey', activity: '',               online: false },
    ],
    kpiHighlights: [
      { label: 'Net Sales',        value: '₹187.4 Cr', delta: '▲ 4.2% vs LYSM', breach: false },
      { label: 'Sales vs Target',  value: '68%',       delta: '▼ 6pp MTD pace',  breach: true  },
      { label: 'Sec:Pri Gap',      value: '22%',       delta: '▲ 5.8pp vs norm', breach: true  },
      { label: 'Active Drifts',    value: '23',        delta: '8 critical',       breach: true  },
    ],
    warRoomActions: [
      { label: 'Escalate to NSM',   key: 'escalate-nsm',   tone: 'red'   },
      { label: 'Add to war room',   key: 'add-war-room',   tone: 'normal'},
      { label: 'Territory redesign',key: 'territory',       tone: 'normal'},
      { label: 'Expansion planning',key: 'expansion',       tone: 'normal'},
    ],
    fieldActions: ['Schedule review', 'Flag distributor', 'Send summary to team'],
  },

  'S-01': {
    seedMessage: 'Reach Health · 11.9K billed outlets · ND% down 18.4% in West/Diapers. 3 districts critical. Want a geo-drill?',
    suggestions: [
      'Which districts have the worst outlet churn?',
      'Compare reach vs last month by state',
      'Show me TLP towns with sub-50% ND%',
      'What is driving the West reach drop?',
    ],
    people: [
      { name: 'A. Verma',     role: 'ASM',  territory: 'West-3',    activity: 'beat visit today',   online: true  },
      { name: 'P. Gupta',     role: 'RSM',  territory: 'West',      activity: 'DA-01 assigned',     online: true  },
      { name: 'S. Iyer',      role: 'ASM',  territory: 'Gujarat',   activity: 'outlet census',      online: true  },
      { name: 'N. Shah',      role: 'SR',   territory: 'Vasai',     activity: 'activation sprint',  online: false },
      { name: 'K. Pillai',    role: 'ASM',  territory: 'Goa',       activity: '',                   online: false },
    ],
    kpiHighlights: [
      { label: 'Billed Outlets', value: '11.9K',  delta: '▼ 0.6% vs LM',    breach: false },
      { label: 'ND% West',       value: '61.6%',  delta: '▼ 18.4% vs LM',   breach: true  },
      { label: 'Churn Rate',     value: '2.3×',   delta: 'historical avg',   breach: true  },
      { label: 'New Outlets',    value: '+142',    delta: 'activated MTD',    breach: false },
    ],
    warRoomActions: [
      { label: 'Launch reach recovery sprint', key: 'reach-sprint',  tone: 'red'   },
      { label: 'Add to war room',             key: 'add-war-room',  tone: 'normal'},
      { label: 'Activate outlet list',        key: 'activate',      tone: 'normal'},
      { label: 'Beat redesign — West',        key: 'beat-redesign', tone: 'amber' },
    ],
    fieldActions: ['Log outlet visit', 'Flag inactive outlet', 'Schedule activation sprint'],
  },

  'S-02': {
    seedMessage: 'Extraction Health · WSP/outlet at ₹1,248/call · Lines per call 3.4 (down 0.5 vs L3M). Urban beats are lagging.',
    suggestions: [
      'Which SOs have the lowest WSP?',
      'Compare extraction vs cohort benchmark',
      'Show me urban beat productivity drop',
      'Top SKUs pulling down lines per call',
    ],
    people: [
      { name: 'R. K. Singh',  role: 'SO',   territory: 'West-ASM-W1-02', activity: '▼ 22% billed sales', online: true  },
      { name: 'M. Joshi',     role: 'ASM',  territory: 'Mumbai Urban',   activity: 'extraction audit',   online: true  },
      { name: 'S. Nair',      role: 'RSM',  territory: 'West',           activity: 'coaching call',      online: false },
      { name: 'A. Pillai',    role: 'SO',   territory: 'Pune',           activity: 'beat in progress',   online: true  },
      { name: 'V. Kumar',     role: 'ASM',  territory: 'Nashik',         activity: '',                   online: false },
    ],
    kpiHighlights: [
      { label: 'WSP / Outlet',     value: '₹1,248', delta: '▲ 2.6% vs L3M',  breach: false },
      { label: 'Lines / Call',     value: '3.4',    delta: '▼ 0.5 vs L3M',   breach: false },
      { label: 'Prod. Call Rate',  value: '63.8%',  delta: '▼ 15.4pp vs LM', breach: true  },
      { label: 'SO Productivity',  value: '74%',    delta: '▲ 0.9pp',         breach: false },
    ],
    warRoomActions: [
      { label: 'Open SO coaching plan',        key: 'coaching',      tone: 'red'   },
      { label: 'Beat redesign for low SOs',    key: 'beat-redesign', tone: 'amber' },
      { label: 'Extraction benchmark review',  key: 'benchmark',     tone: 'normal'},
      { label: 'Schedule field ride-along',    key: 'ride-along',    tone: 'normal'},
    ],
    fieldActions: ['Log call report', 'Flag extraction issue', 'Voice note — outlet feedback'],
  },

  'S-03': {
    seedMessage: 'Pipeline Health · Sec:Pri at 22% (breach, +5.8pp vs norm) · 3 distributors stuffing in West. DA-03 is critical.',
    suggestions: [
      'Which distributors are stuffing pipeline?',
      'Show Sec:Pri trend for last 6 months',
      'Calculate pipeline exposure in ₹Cr',
      'What action stops stuffing fastest?',
    ],
    people: [
      { name: 'P. Gupta',     role: 'RSM',  territory: 'West',      activity: 'DA-03 field visit',  online: true  },
      { name: 'R. Mehta',     role: 'ZSM',  territory: 'West',      activity: 'scheme review',      online: true  },
      { name: 'A. Verma',     role: 'ASM',  territory: 'West-3',    activity: 'distributor call',   online: true  },
      { name: 'Finance',      role: 'FC',   territory: 'National',  activity: 'credit hold review', online: false },
      { name: 'D. Nair',      role: 'ASM',  territory: 'Vasai',     activity: '',                   online: false },
    ],
    kpiHighlights: [
      { label: 'Sec:Pri Ratio',   value: '22%',    delta: '▲ 5.8pp vs norm',  breach: true  },
      { label: 'Pipeline Lock',   value: '₹18.4Cr',delta: 'over-stock est.',  breach: true  },
      { label: 'Fill Rate',       value: '91%',    delta: '▲ 0.4pp',          breach: false },
      { label: 'Days Stock',      value: '34d',    delta: 'norm: 18-22d',     breach: true  },
    ],
    warRoomActions: [
      { label: 'Issue stop-supply memo',      key: 'stop-supply',   tone: 'red'   },
      { label: 'Scheme adjustment — West',    key: 'scheme-adj',    tone: 'amber' },
      { label: 'Distributor meeting request', key: 'db-meeting',    tone: 'normal'},
      { label: 'Escalate to NSM',             key: 'escalate-nsm',  tone: 'red'   },
    ],
    fieldActions: ['Log distributor visit', 'Upload scan-pri data', 'Flag credit dispute'],
  },

  'S-04': {
    seedMessage: 'Channel Mix · GT share at 64.1% (▼ 2.4pp/qtr) · MT and QC gaining. 6 micromarkets showing structural shift.',
    suggestions: [
      'Which micromarkets are flipping from GT to MT?',
      'Compare channel ROI — GT vs MT vs QC',
      'What is the eComm trajectory?',
      'Build GT defence playbook for North-2',
    ],
    people: [
      { name: 'V. Rao',      role: 'RSM',   territory: 'South',     activity: 'QC onboarding',     online: true  },
      { name: 'Category',    role: 'Mktg',  territory: 'National',  activity: 'archetype review',  online: true  },
      { name: 'B. Kant',     role: 'RSM',   territory: 'North-2',   activity: 'GT audit',          online: true  },
      { name: 'MT Key Acc.', role: 'KAM',   territory: 'National',  activity: 'JBP meeting',       online: false },
    ],
    kpiHighlights: [
      { label: 'GT Share',   value: '64.1%', delta: '▼ 2.4pp/qtr', breach: false },
      { label: 'MT Share',   value: '22.6%', delta: '▲ 1.5pp',     breach: false },
      { label: 'QC Share',   value: '9.8%',  delta: '▲ 1.1pp',     breach: false },
      { label: 'eComm',      value: '3.5%',  delta: '▲ 0.3pp',     breach: false },
    ],
    warRoomActions: [
      { label: 'Trigger archetype revision',   key: 'archetype',     tone: 'red'   },
      { label: 'GT exclusivity activation',    key: 'gt-exclusive',  tone: 'amber' },
      { label: 'Open QC listing — micromarket',key: 'qc-listing',    tone: 'normal'},
      { label: 'Channel ROI comparison',       key: 'channel-roi',   tone: 'normal'},
    ],
    fieldActions: ['Log channel observation', 'Flag MT incursion', 'Photo — shelf audit'],
  },

  'S-05': {
    seedMessage: 'Territory & SFA Health · MAU 74% · Beat productivity 63.8% (4 SOs critical) · SFA adoption down 12% in South.',
    suggestions: [
      'Show me SOs below 60% beat efficiency',
      'Which beats have zero billing today?',
      'Compare productive call rate vs target',
      'SFA adoption drop — root cause in South',
    ],
    people: [
      { name: 'R. K. Singh',  role: 'SO',   territory: 'West-ASM-W1', activity: '▼ 22% billed sales',  online: true  },
      { name: 'S. Mishra',    role: 'ASM',  territory: 'South',        activity: 'SFA coaching',        online: true  },
      { name: 'V. Rao',       role: 'RSM',  territory: 'South',        activity: 'beat audit',          online: true  },
      { name: 'HR Training',  role: 'HR',   territory: 'National',     activity: 'coaching schedule',   online: false },
      { name: 'P. Bhat',      role: 'SO',   territory: 'Bangalore',    activity: 'below threshold',     online: false },
    ],
    kpiHighlights: [
      { label: 'MAU',              value: '74%',   delta: '▲ 0.9pp',      breach: false },
      { label: 'Beat Efficiency',  value: '63.8%', delta: '▼ 15pp vs LM', breach: true  },
      { label: 'SFA Adoption',     value: '▼12%',  delta: 'vs L3M South', breach: true  },
      { label: 'DBs — 0 billing',  value: '4',     delta: 'today',        breach: true  },
    ],
    warRoomActions: [
      { label: 'Launch SO coaching sprint',   key: 'coaching-sprint', tone: 'red'   },
      { label: 'Beat redesign — 4 SOs',      key: 'beat-redesign',   tone: 'amber' },
      { label: 'SFA adoption push — South',  key: 'sfa-push',        tone: 'normal'},
      { label: 'Flag to HR for PIP review',  key: 'pip-review',      tone: 'normal'},
    ],
    fieldActions: ['Log beat observation', 'Voice note — SO feedback', 'Mark visit done'],
  },

  'S-06': {
    seedMessage: 'Promo Health · Diapers Q4 at 42% target uplift · Participation 38% vs 60% target. Course-correction window open.',
    suggestions: [
      'Why is Diapers Q4 promo underperforming?',
      'Which SKUs are seeing highest uplift?',
      'Show participation rate by region',
      'Calculate promo ROI at current pace',
    ],
    people: [
      { name: 'Category Mktg', role: 'Mktg', territory: 'National', activity: 'promo review',       online: true  },
      { name: 'S. Mishra',     role: 'ASM',  territory: 'Central',  activity: 'visibility kits',   online: true  },
      { name: 'Trade Mktg',    role: 'TM',   territory: 'National', activity: 'scheme nudge',       online: false },
      { name: 'N. Khanna',     role: 'ZSM',  territory: 'South',    activity: 'promo compliance',  online: false },
    ],
    kpiHighlights: [
      { label: 'Promo Uplift',    value: '42%',  delta: 'vs 50% target', breach: true  },
      { label: 'Participation',   value: '38%',  delta: 'vs 60% target', breach: true  },
      { label: 'ROI (est.)',      value: '1.8×', delta: 'target: 2.2×',  breach: true  },
      { label: 'Visibility Kits', value: '61%',  delta: 'deployed',      breach: false },
    ],
    warRoomActions: [
      { label: 'Issue course-correction memo',   key: 'course-correct', tone: 'red'   },
      { label: 'Deploy visibility kits — gaps',  key: 'vis-kits',       tone: 'amber' },
      { label: 'Extend promo — 2 weeks',        key: 'extend-promo',   tone: 'normal'},
      { label: 'Scheme nudge — low regions',    key: 'scheme-nudge',   tone: 'normal'},
    ],
    fieldActions: ['Log promo observation', 'Photo — shelf/display', 'Flag non-compliance'],
  },

  'S-07': {
    seedMessage: 'Benchmark · Extraction 3.1pp below cohort P50 · Sustained 4M. Sanitary Napkins is the key drag.',
    suggestions: [
      'Which categories are most below benchmark?',
      'Compare our WSP vs cohort P75',
      'Show peer performance for North-2',
      'What would P50 recovery be worth in ₹?',
    ],
    people: [
      { name: 'Analytics',    role: 'Data',  territory: 'National',  activity: 'cohort update',    online: true  },
      { name: 'S. Nair',      role: 'NSM',   territory: 'National',  activity: 'benchmark review', online: false },
      { name: 'Category',     role: 'Mktg',  territory: 'National',  activity: 'gap analysis',     online: true  },
    ],
    kpiHighlights: [
      { label: 'vs P50',        value: '▼3.1pp', delta: 'extraction gap', breach: true  },
      { label: 'vs P75',        value: '▼7.4pp', delta: 'stretch target', breach: true  },
      { label: 'SN Category',   value: 'Worst',  delta: 'vs cohort',      breach: true  },
      { label: 'Best region',   value: 'South',  delta: 'at P55',         breach: false },
    ],
    warRoomActions: [
      { label: 'Initiate benchmark gap program', key: 'benchmark-gap', tone: 'red'   },
      { label: 'SN extraction deep-dive',        key: 'sn-deep-dive',  tone: 'amber' },
      { label: 'Share cohort report with NSM',   key: 'share-nsm',     tone: 'normal'},
    ],
    fieldActions: ['Log competitor observation', 'Share benchmark to team', 'Flag SKU gap'],
  },

  'S-08': {
    seedMessage: 'Outstanding Health · >30d at 34% of primary · 4 distributors hold 68% of exposure. ₹8.2L at risk.',
    suggestions: [
      'Which distributors have >30d outstanding?',
      'Show collection rate trend last 3 months',
      'Calculate credit-at-risk by region',
      'Draft a collection escalation notice',
    ],
    people: [
      { name: 'Finance',      role: 'FC',   territory: 'National',  activity: 'credit review',    online: true  },
      { name: 'R. Kumar',     role: 'ASM',  territory: 'North-1',   activity: 'collection drive', online: true  },
      { name: 'P. Gupta',     role: 'RSM',  territory: 'West',      activity: 'DB co-visit',      online: true  },
      { name: 'Legal',        role: 'Legal',territory: 'National',  activity: 'escalation review',online: false },
    ],
    kpiHighlights: [
      { label: '>30d Outstanding', value: '34%',    delta: 'of primary',       breach: true  },
      { label: 'At-risk ₹',        value: '₹8.2L',  delta: '4 distributors',   breach: true  },
      { label: 'Collection Rate',  value: '71%',    delta: '▼ 7pp vs norm',    breach: true  },
      { label: 'Credit Hold DBs',  value: '2',      delta: 'pending clearance', breach: false },
    ],
    warRoomActions: [
      { label: 'Issue collection escalation', key: 'collection-esc', tone: 'red'   },
      { label: 'Credit hold — top 2 DBs',    key: 'credit-hold',    tone: 'red'   },
      { label: 'Finance + ASM co-visit',     key: 'co-visit',       tone: 'amber' },
      { label: 'Legal notice draft',         key: 'legal-notice',   tone: 'normal'},
    ],
    fieldActions: ['Log collection call', 'Upload payment receipt', 'Flag dispute'],
  },

  'S-09': {
    seedMessage: 'Untapped Potential · 27 under-penetrated towns with demand >P75 but ND% <20%. ₹14.2L potential identified.',
    suggestions: [
      'Show me the top 10 whitespace towns',
      'Which category has most untapped potential?',
      'Estimate investment needed for town activation',
      'Compare demand index vs current ND% by state',
    ],
    people: [
      { name: 'Rural Agent', role: 'Agent',  territory: 'North-1/2', activity: 'town mapping',     online: true  },
      { name: 'B. Kant',     role: 'RSM',    territory: 'North-2',   activity: 'whitespace review',online: true  },
      { name: 'Analytics',   role: 'Data',   territory: 'National',  activity: 'demand model',     online: false },
      { name: 'Network Eng', role: 'NWE',    territory: 'National',  activity: 'SD planning',      online: false },
    ],
    kpiHighlights: [
      { label: 'Whitespace Towns', value: '27',      delta: '>P75 demand',   breach: false },
      { label: 'Potential Value',  value: '₹14.2L',  delta: 'addressable',  breach: false },
      { label: 'Avg ND% in towns', value: '18%',     delta: 'vs 60% target',breach: true  },
      { label: 'Towns activated',  value: '4',        delta: 'MTD',          breach: false },
    ],
    warRoomActions: [
      { label: 'Activate top-5 whitespace towns', key: 'town-activation', tone: 'red'   },
      { label: 'SD rebalance — coverage radius',  key: 'sd-rebalance',    tone: 'amber' },
      { label: 'Rural agent deployment',          key: 'rural-agent',     tone: 'normal'},
      { label: 'Demand model refresh',            key: 'demand-model',    tone: 'normal'},
    ],
    fieldActions: ['Log new town visit', 'Photo — town census', 'Flag opportunity'],
  },

  'WAR-ROOM': {
    seedMessage: 'War Room · 14 active actions · 6 open, 3 in-progress, 3 awaiting. Stop-supply memo on CID-F4EC3791 is due today.',
    suggestions: [
      'Summarise all open actions for my review',
      'Which actions are most overdue?',
      'What is the status of DA-03 resolution?',
      'Draft a war room update for NSM',
    ],
    people: [
      { name: 'P. Gupta',  role: 'RSM', territory: 'West',  activity: 'Stop-supply memo', online: true  },
      { name: 'A. Verma',  role: 'ASM', territory: 'West',  activity: 'Beat audit W8',    online: true  },
      { name: 'R. Mehta',  role: 'ZSM', territory: 'West',  activity: 'Review call Nov 9', online: true  },
      { name: 'N. Khanna', role: 'ZSM', territory: 'South', activity: 'Depot rebalance',  online: false },
      { name: 'R. Kumar',  role: 'ASM', territory: 'North', activity: 'Collection drive', online: false },
    ],
    kpiHighlights: [
      { label: 'Open Actions',      value: '6',  delta: 'need action',     breach: true  },
      { label: 'In Progress',       value: '3',  delta: 'on track',        breach: false },
      { label: 'Awaiting Response', value: '3',  delta: 'pending',         breach: false },
      { label: 'Closed this month', value: '3',  delta: 'resolved',        breach: false },
    ],
    warRoomActions: [
      { label: 'Escalate to NSM',         key: 'escalate-nsm',    tone: 'red'   },
      { label: 'Send war room update',    key: 'send-update',     tone: 'amber' },
      { label: 'Close resolved actions',  key: 'close-resolved',  tone: 'normal'},
      { label: 'Add new action',          key: 'add-action',      tone: 'normal'},
    ],
    fieldActions: ['Log field update', 'Upload evidence', 'Mark action complete'],
  },
}
