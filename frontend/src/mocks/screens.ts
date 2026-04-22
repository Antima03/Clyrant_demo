// Complete enhanced screens with all helpful content - will replace the incomplete version
import type { ScreenId } from '@/types'

export type ScreenChartKind = 'area' | 'line' | 'bar'

export interface ScreenKpi {
  label: string
  value: string
  delta?: string // e.g. "▼ 1.8pp"
  tone?: 'red' | 'green' | 'neutral'
  caption?: string
  tooltip?: string // explains what this KPI means
  status?: 'critical' | 'warning' | 'good' // alert level
}

export interface ScreenTrendPoint {
  month: string
  value: number
  benchmark?: number // P50 / target / cohort reference (optional)
}

export interface ScreenModule {
  id: string
  title: string
  desc: string
}

export interface ScreenQuickAction {
  label: string
  hint: string
}

export interface ScreenContent {
  primaryColor: 'blue' | 'red' | 'green' | 'amber' | 'purple'
  chartKind: ScreenChartKind
  chartLabel: string
  chartUnit: string
  trend: ScreenTrendPoint[]
  kpis: ScreenKpi[]
  modules: ScreenModule[]
  quickActions: ScreenQuickAction[]
  intro: string // explains what this screen helps you understand
  insights: string[] // 2-3 key takeaways from current data
  recommendations: string[] // 2-3 suggested actions based on current state
}

const MONTHS = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr']
const trend = (vals: number[], benchmark?: number) =>
  vals.map((v, i) => ({ month: MONTHS[i]!, value: v, benchmark }))

export const screensMock: Record<Exclude<ScreenId, 'S-00'>, ScreenContent> = {
  // All screens with complete helpful content...
  'S-04': {
    primaryColor: 'purple',
    chartKind: 'bar',
    chartLabel: 'GT share · 6-month trend',
    chartUnit: '% of revenue',
    trend: trend([68, 67, 66, 65.5, 64.8, 64.1], 70),
    intro: 'Track channel mix evolution and market dynamics across GT, MT, QC, and eCommerce to optimize go-to-market strategy.',
    insights: [
      'GT share declining 2.4pp in 6 months as organized retail gains momentum',
      'Quick commerce growing fastest (+1.1pp) followed by MT expansion',
      'Structural shift occurring in 6 micromarkets from GT-dominant to MT/QC'
    ],
    recommendations: [
      'Trigger archetype revision for shifting micromarkets (M06 playbook)',
      'Compare channel ROI to optimize investment allocation',
      'Open war-room on GT structural shift finding (DA-04)'
    ],
    kpis: [
      {
        label: 'GT share',
        value: '64.1%',
        delta: '▼ 2.4pp',
        tone: 'red',
        caption: 'trend · per quarter',
        tooltip: 'General Trade share of revenue. Traditional kirana, mom & pop stores. Usually 60-75% for FMCG.',
        status: 'warning'
      },
      {
        label: 'MT share',
        value: '22.6%',
        delta: '▲ 1.5pp',
        tone: 'green',
        caption: 'organised retail',
        tooltip: 'Modern Trade: Organized retail chains, supermarkets. Growing channel for urban markets.',
        status: 'good'
      },
      {
        label: 'QC share',
        value: '9.8%',
        delta: '▲ 1.1pp',
        tone: 'green',
        caption: 'quick commerce',
        tooltip: 'Quick Commerce platforms (Blinkit, Zepto, etc). Fastest growing channel in metro cities.',
        status: 'good'
      },
      {
        label: 'eComm share',
        value: '3.5%',
        delta: '▲ 0.3pp',
        tone: 'green',
        caption: 'platforms',
        tooltip: 'E-commerce platforms (Amazon, Flipkart). Growing but still small for traditional FMCG.',
        status: 'good'
      },
    ],
    modules: [
      {
        id: 'channel-mix-by-geo',
        title: 'Channel mix · geo',
        desc: 'State-level GT / MT / QC / eComm split, with shift-rate.',
      },
      {
        id: 'archetype-drift',
        title: 'Micromarket archetype drift',
        desc: 'Markets crossing from GT-dominant to MT/QC-dominant.',
      },
      {
        id: 'channel-roi',
        title: 'Channel ROI',
        desc: 'Margin and trade spend ratio per channel.',
      },
    ],
    quickActions: [
      { label: 'Trigger archetype revision', hint: 'Queue M06 playbook update' },
      { label: 'Compare channel ROI', hint: 'Side-by-side profitability' },
      { label: 'Open war-room on DA-04', hint: 'GT structural shift finding' },
      { label: 'Export shift micromarkets', hint: '6 markets where GT:MT flipped' },
    ],
  },

  'S-05': {
    primaryColor: 'red',
    chartKind: 'line',
    chartLabel: 'SO productivity · productive call rate',
    chartUnit: '%',
    trend: trend([81, 80, 79, 79.5, 79, 72], 80),
    intro: 'Monitor sales force effectiveness through productivity metrics, beat compliance, and SFA adoption to optimize territory coverage.',
    insights: [
      'Productive call rate dropped to 72% (7pp decline) - critical threshold breached',
      'SFA adoption declining with MAU down 12% vs L3M average',
      'Visit compliance at 82% but quality metrics deteriorating'
    ],
    recommendations: [
      'Open war-room on SO_077748 productivity drift (DA-05)',
      'Re-plan beats using M04 network redesign module',
      'Push SFA training bundle to bottom quartile SOs'
    ],
    kpis: [
      {
        label: 'Productive call rate',
        value: '72%',
        delta: '▼ 7pp',
        tone: 'red',
        caption: 'network-wide',
        tooltip: '% of sales calls that result in orders. Measures SO effectiveness and market engagement.',
        status: 'critical'
      },
      {
        label: 'MAU',
        value: '812',
        delta: '▼ 12%',
        tone: 'red',
        caption: 'vs L3M',
        tooltip: 'Monthly Active Users on SFA platform. Critical for digital adoption and data quality.',
        status: 'warning'
      },
      {
        label: 'Visit compliance',
        value: '82%',
        delta: '▼ 2pp',
        tone: 'red',
        caption: 'beat plan adherence',
        tooltip: 'Percentage of planned outlet visits completed. Measures beat plan execution discipline.',
        status: 'warning'
      },
      {
        label: 'Lines / call',
        value: '2.4',
        delta: '▼ 0.1',
        tone: 'red',
        caption: 'sustained 2M',
        tooltip: 'Average SKU lines ordered per call. Indicates depth of engagement and portfolio push.',
        status: 'warning'
      },
    ],
    modules: [
      {
        id: 'so-leaderboard',
        title: 'SO productivity leaderboard',
        desc: 'Bottom 30 SOs by productive-call-rate drop.',
      },
      {
        id: 'beat-density',
        title: 'Beat density map',
        desc: 'Outlets/beat vs planned, with travel-time heatmap.',
      },
      {
        id: 'sfa-adoption',
        title: 'SFA adoption decay',
        desc: 'MAU trend by state + bottom-quartile SOs.',
      },
    ],
    quickActions: [
      { label: 'Open war-room on DA-05', hint: 'SO_077748 productivity drift' },
      { label: 'Re-plan beats', hint: 'Queue M04 network redesign' },
      { label: 'Push SFA training bundle', hint: 'For SOs in bottom quartile' },
      { label: 'Export compliance CSV', hint: 'All SOs below 70% compliance' },
    ],
  },

  // Continue with remaining screens...
  'S-06': {
    primaryColor: 'amber',
    chartKind: 'bar',
    chartLabel: 'Scheme uplift · target vs actual',
    chartUnit: '% uplift',
    trend: trend([18, 21, 17, 14, 11, 9], 20),
    intro: 'Analyze promotional effectiveness through uplift metrics, ROI analysis, and participation rates to optimize trade spend allocation.',
    insights: [
      'Scheme uplift dropped to 9% vs 20% target - significant underperformance',
      'ROI declined to 1.2x vs target 1.8x, indicating inefficient spend',
      'Participation at 38% vs 60% target shows poor scheme design or execution'
    ],
    recommendations: [
      'Open war-room on Diapers Q4 promo underperforming (DA-06)',
      'Revise scheme mechanics using M05 design engine',
      'Auto-pause schemes with ROI below 1x to stem losses'
    ],
    kpis: [
      {
        label: 'Uplift %',
        value: '9.0%',
        delta: '▼ 42%',
        tone: 'red',
        caption: 'vs target uplift',
        tooltip: 'Incremental sales uplift from promotional schemes. Target: 15-25% for effective schemes.',
        status: 'critical'
      },
      {
        label: 'ROI',
        value: '1.2×',
        delta: '▼ 0.6×',
        tone: 'red',
        caption: 'spend : incremental',
        tooltip: 'Return on promotional investment. Incremental revenue / promotional spend. Target: >1.5x.',
        status: 'critical'
      },
      {
        label: 'Participation',
        value: '38%',
        delta: '▼ 22pp',
        tone: 'red',
        caption: 'target 60%',
        tooltip: 'Percentage of target outlets participating in promotional schemes. Indicates reach effectiveness.',
        status: 'critical'
      },
      {
        label: 'Active schemes',
        value: '14',
        delta: '▲ 2',
        tone: 'neutral',
        caption: 'MTD',
        tooltip: 'Number of promotional schemes currently running. Monitor for scheme fatigue and overlap.',
        status: 'good'
      },
    ],
    modules: [
      {
        id: 'scheme-performance',
        title: 'Scheme performance matrix',
        desc: 'Uplift × participation, outliers on both axes.',
      },
      {
        id: 'channel-roi',
        title: 'Channel-level scheme ROI',
        desc: 'Margin, spend, incremental by channel.',
      },
      {
        id: 'promo-course',
        title: 'Course-correction queue',
        desc: 'Mid-flight schemes failing to hit milestones.',
      },
    ],
    quickActions: [
      { label: 'Open war-room on DA-06', hint: 'Diapers Q4 promo underperforming' },
      { label: 'Revise scheme mechanic', hint: 'Trigger M05 scheme design engine' },
      { label: 'Pause below-threshold schemes', hint: 'Auto-pause ROI < 1×' },
      { label: 'Compare to LY schemes', hint: 'Same promo window YoY' },
    ],
  },

  // Add all other screens with complete data...
  'S-07': {
    primaryColor: 'blue',
    chartKind: 'line',
    chartLabel: 'Client vs cohort P50 · Extraction index',
    chartUnit: 'Index (cohort P50 = 100)',
    trend: trend([97, 96, 95, 94, 93, 92], 100),
    intro: 'Compare performance against industry cohorts across key metrics to identify competitive gaps and benchmark improvement opportunities.',
    insights: [
      'Extraction index 8 points below cohort P50 for 4 consecutive months',
      'Pipeline health significantly lagging (88 vs 100) indicating structural issues',
      'Channel mix fit declining, suggesting archetype misalignment'
    ],
    recommendations: [
      'Switch to P75 benchmark to identify best-in-class performance gaps',
      'Drill into pipeline metrics as they drag aggregate performance most',
      'Request cohort model refresh via M03 module'
    ],
    kpis: [
      {
        label: 'Extraction vs P50',
        value: '92',
        delta: '▼ 3.1pp',
        tone: 'red',
        caption: '4M sustained',
        tooltip: 'Weighted sales per outlet vs cohort median. Index where 100 = cohort P50 performance.',
        status: 'warning'
      },
      {
        label: 'Reach vs P50',
        value: '96',
        delta: '▼ 1.2pp',
        tone: 'red',
        caption: 'closing',
        tooltip: 'Outlet coverage and ND% vs cohort P50. Indicates market penetration effectiveness.',
        status: 'warning'
      },
      {
        label: 'Pipeline vs P50',
        value: '88',
        delta: '▼ 4.3pp',
        tone: 'red',
        caption: 'critical',
        tooltip: 'Sec:Pri ratio and distributor health vs cohort P50. Critical performance gap.',
        status: 'critical'
      },
      {
        label: 'Channel-mix fit',
        value: '81',
        delta: '▼ 2.7pp',
        tone: 'red',
        caption: 'vs cohort archetype',
        tooltip: 'How well channel strategy fits market archetype vs similar peers. Indicates strategic alignment.',
        status: 'warning'
      },
    ],
    modules: [
      {
        id: 'bench-radar',
        title: 'Benchmark radar',
        desc: '4-axis client vs cohort P50 / P75 radar.',
      },
      {
        id: 'gap-attrib',
        title: 'Gap attribution',
        desc: 'Which sub-metrics drag the aggregate the most.',
      },
      {
        id: 'cohort-filter',
        title: 'Cohort filter',
        desc: 'Slice to same-size / same-category peers.',
      },
    ],
    quickActions: [
      { label: 'Switch cohort', hint: 'Compare to P75 or same-archetype peers' },
      { label: 'Open narrowest gap', hint: 'Drill into the metric furthest from P50' },
      { label: 'Export benchmark report', hint: 'Monthly cohort deck' },
      { label: 'Request cohort refresh', hint: 'Trigger M03 cohort model rebuild' },
    ],
  },

  'S-08': {
    primaryColor: 'red',
    chartKind: 'area',
    chartLabel: '>30d Outstanding · 6 months',
    chartUnit: '₹ Cr',
    trend: trend([18.2, 19.1, 20.4, 22.7, 24.3, 26.1], 20),
    intro: 'Monitor credit health through outstanding analysis, collection efficiency, and distributor risk scoring to manage working capital.',
    insights: [
      'Outstanding >30d increased 34% to ₹26.1 Cr over 2 months',
      'Collection rate at 78% vs 85% target indicating process issues',
      'Concentration risk: ₹9.4 Cr (>60d) across just 4 distributors'
    ],
    recommendations: [
      'Freeze new billing for top 4 concentrated distributors immediately',
      'Trigger reconciliation process through finance partner',
      'Open war-room on outstanding concentration finding (DA-09)'
    ],
    kpis: [
      {
        label: '>30d O/S',
        value: '₹ 26.1 Cr',
        delta: '▲ 34%',
        tone: 'red',
        caption: 'sustained 2M',
        tooltip: 'Outstanding amounts >30 days. Critical for cash flow and indicates credit risk concentration.',
        status: 'critical'
      },
      {
        label: 'Collection rate',
        value: '78%',
        delta: '▼ 4pp',
        tone: 'red',
        caption: 'vs target 85%',
        tooltip: 'Percentage of dues collected within 30 days. Measures collection process efficiency.',
        status: 'warning'
      },
      {
        label: '>60d O/S',
        value: '₹ 9.4 Cr',
        delta: '▲ 21%',
        tone: 'red',
        caption: 'concentrated · 4 DBs',
        tooltip: 'Outstanding >60 days. Higher risk category requiring immediate attention and possible write-offs.',
        status: 'critical'
      },
      {
        label: 'O/S : Primary',
        value: '38%',
        delta: '▲ 7pp',
        tone: 'red',
        caption: 'leverage ratio',
        tooltip: 'Outstanding as % of primary sales. Indicates credit exposure relative to business volume.',
        status: 'critical'
      },
    ],
    modules: [
      {
        id: 'ageing-bucket',
        title: 'Ageing bucket',
        desc: '30 / 60 / 90 / >90 day stratification with DB breakdown.',
      },
      {
        id: 'dispute-queue',
        title: 'Dispute queue',
        desc: 'Deductions, credit notes, reconciliation status.',
      },
      {
        id: 'risk-scoring',
        title: 'Distributor risk scoring',
        desc: 'Blending payment history with ageing + primary exposure.',
      },
    ],
    quickActions: [
      { label: 'Open war-room on DA-09', hint: 'Outstanding concentration finding' },
      { label: 'Freeze new billing · top 4', hint: 'Credit hold on 4 concentrated DBs' },
      { label: 'Trigger reconciliation', hint: 'Route to finance partner' },
      { label: 'Export ageing CSV', hint: 'Full DB-level breakdown' },
    ],
  },

  'S-09': {
    primaryColor: 'green',
    chartKind: 'bar',
    chartLabel: 'Identified potential · micromarket clusters',
    chartUnit: '₹ L / month',
    trend: trend([9.8, 10.6, 11.2, 12.4, 13.1, 14.2], 8),
    intro: 'Identify whitespace opportunities through demand modeling and network gap analysis to guide expansion investments.',
    insights: [
      'Whitespace potential identified at ₹14.2L/month (+45% vs baseline)',
      '27 under-penetrated micromarkets with demand index >131',
      'Expected ROI of 2.1x for network expansion makes business case strong'
    ],
    recommendations: [
      'Open war-room on top whitespace opportunity finding (DB-01)',
      'Design expansion plan using M02 + M04 module chain',
      'Dispatch field validation team to top 5 micromarkets'
    ],
    kpis: [
      {
        label: 'Whitespace potential',
        value: '₹ 14.2 L',
        delta: '▲ 45%',
        tone: 'green',
        caption: 'vs baseline demand',
        tooltip: 'Identified revenue opportunity in under-penetrated areas. Based on demand modeling vs current coverage.',
        status: 'good'
      },
      {
        label: 'Target MMs',
        value: '27',
        delta: '▲ 4',
        tone: 'green',
        caption: 'under-penetrated',
        tooltip: 'Micromarkets identified as under-penetrated with high potential. Candidates for network expansion.',
        status: 'good'
      },
      {
        label: 'Demand index',
        value: '131',
        delta: '▲ 6',
        tone: 'green',
        caption: 'vs national P50',
        tooltip: 'Demand strength in target micromarkets vs national median. >120 indicates high potential.',
        status: 'good'
      },
      {
        label: 'Expected ROI',
        value: '2.1×',
        delta: '—',
        tone: 'neutral',
        caption: 'M04 network design',
        tooltip: 'Projected return on investment for network expansion in identified micromarkets over 12 months.',
        status: 'good'
      },
    ],
    modules: [
      {
        id: 'gap-scoring',
        title: 'Gap scoring map',
        desc: 'Under-penetrated × under-indexed towns, ranked by size-of-prize.',
      },
      {
        id: 'network-design',
        title: 'Network-design simulator',
        desc: 'Distributor / beat additions needed to close the gap.',
      },
      {
        id: 'roi-forecast',
        title: 'ROI forecast',
        desc: '12-month revenue + margin projection per micromarket.',
      },
    ],
    quickActions: [
      { label: 'Open war-room on DB-01', hint: 'Whitespace opportunity finding' },
      { label: 'Design expansion plan', hint: 'Trigger M02 + M04 module chain' },
      { label: 'Score micromarkets', hint: 'Re-rank by current ND × demand' },
      { label: 'Request field validation', hint: 'Dispatch MTM to top 5 MMs' },
    ],
  },

  // Inherit S-01, S-02, S-03 from the original file...
  'S-01': {
    primaryColor: 'red',
    chartKind: 'area',
    chartLabel: 'Billed outlet universe · 6-month reach trend',
    chartUnit: 'outlets',
    trend: trend([96400, 96200, 96800, 97100, 96900, 94800], 96000),
    intro: 'Monitor your market reach through outlet coverage, numeric distribution, and churn patterns. Identify gaps in coverage and address outlet attrition before it impacts sales.',
    insights: [
      'Outlet universe dropped 2.2% this month, with concentrated churn in 3 key districts',
      'ND% is 3pp below cohort median, indicating potential coverage gaps',
      'Churn rate increased 2.3x vs historical — requires immediate attention'
    ],
    recommendations: [
      'Focus revival campaigns on the 9 breach districts where reach dropped ≥10%',
      'Deploy territory managers to validate coverage gaps in high-demand areas',
      'Analyze churn drivers: credit issues, competitor moves, or SO changes'
    ],
    kpis: [
      {
        label: 'Billed outlets',
        value: '94.8K',
        delta: '▼ 2.2%',
        tone: 'red',
        caption: 'vs LM',
        tooltip: 'Total outlets that received at least one invoice this month. Core measure of market reach.',
        status: 'warning'
      },
      {
        label: 'ND %',
        value: '73.1%',
        delta: '▼ 1.1pp',
        tone: 'red',
        caption: 'cohort P50: 76%',
        tooltip: 'Numeric Distribution: % of target outlets where your products are available. Industry standard is 75-80%.',
        status: 'warning'
      },
      {
        label: 'Coverage gap',
        value: '12.4K',
        delta: '▲ 8%',
        tone: 'red',
        caption: 'targeted untapped',
        tooltip: 'High-potential outlets not yet covered. Based on demand modeling and competitor analysis.',
        status: 'critical'
      },
      {
        label: 'Churned outlets',
        value: '2.1K',
        delta: '▲ 2.3×',
        tone: 'red',
        caption: 'vs historical LM',
        tooltip: 'Outlets that stopped purchasing this month after being active. Track to prevent revenue erosion.',
        status: 'critical'
      },
    ],
    modules: [
      {
        id: 'reach-map',
        title: 'Reach heatmap',
        desc: 'District-level billed-outlet density vs universe, with churn overlay.',
      },
      {
        id: 'coverage-gap',
        title: 'Coverage gap hotspots',
        desc: 'Top 25 districts where demand indexes but ND% is < 40.',
      },
      {
        id: 'churn-drivers',
        title: 'Churn driver attribution',
        desc: 'Credit · scheme · competitor · SO-change decomposition.',
      },
    ],
    quickActions: [
      { label: 'Filter to breach districts', hint: 'Show the 9 districts where reach dropped ≥ 10%' },
      { label: 'Export outlet list', hint: 'Outlets that churned this month, by SO' },
      { label: 'Trigger revival campaign', hint: 'Queue an M05 scheme for flagged outlets' },
      { label: 'Benchmark vs cohort', hint: 'Compare ND% to cohort P50 / P75 (S-07)' },
    ],
  },

  'S-02': {
    primaryColor: 'amber',
    chartKind: 'line',
    chartLabel: 'Weighted sale per outlet · WSP 6M',
    chartUnit: '₹ / outlet',
    trend: trend([1820, 1840, 1835, 1830, 1825, 1790], 1950),
    intro: 'Track value extraction from your outlet network through weighted sales per outlet, universe of sale, and operational efficiency metrics.',
    insights: [
      'WSP declined 1.9% vs LM, now ₹160 below cohort median',
      'Lines per outlet and lines per call both declining for 3 months',
      'Fill rate improvement (+0.3pp) shows supply chain recovery'
    ],
    recommendations: [
      'Focus on SKU mix optimization in outlets with lowest UoS',
      'Deploy revised portfolio recommendations via M06 playbook',
      'Analyze urban-A cohort gaps to identify structural issues'
    ],
    kpis: [
      {
        label: 'WSP',
        value: '₹ 1,790',
        delta: '▼ 1.9%',
        tone: 'red',
        caption: 'cohort P50: ₹1,950',
        tooltip: 'Weighted Sale Per outlet: Average revenue per billed outlet. Key measure of value extraction efficiency.',
        status: 'warning'
      },
      {
        label: 'UoS',
        value: '18.2',
        delta: '▼ 0.4',
        tone: 'red',
        caption: 'lines / billed outlet',
        tooltip: 'Universe of Sale: Average number of SKU lines sold per outlet. Indicates portfolio depth and reach.',
        status: 'warning'
      },
      {
        label: 'Lines / call',
        value: '2.3',
        delta: '▼ 0.1',
        tone: 'red',
        caption: 'sustained 3M',
        tooltip: 'Average SKU lines ordered per sales call. Measures SO productivity and outlet engagement.',
        status: 'warning'
      },
      {
        label: 'Fill rate',
        value: '91.4%',
        delta: '▲ 0.3pp',
        tone: 'green',
        caption: 'improving',
        tooltip: 'Percentage of ordered lines fulfilled from distributor stock. Supply chain efficiency indicator.',
        status: 'good'
      },
    ],
    modules: [
      {
        id: 'wsp-decomp',
        title: 'WSP decomposition',
        desc: 'Volume × mix × price ladder by category + pack.',
      },
      {
        id: 'uos-ladder',
        title: 'UoS ladder',
        desc: 'Distribution of lines/outlet across urban / rural archetypes.',
      },
      {
        id: 'bench-gap',
        title: 'Benchmark gap',
        desc: 'Delta vs cohort median, flagged by structural cause.',
      },
    ],
    quickActions: [
      { label: 'Open UoS heatmap', hint: 'Where lines/outlet has declined most' },
      { label: 'Extract SKU mix gap', hint: 'Missing SKUs causing UoS erosion' },
      { label: 'Push revised portfolio', hint: 'Trigger M06 playbook engine' },
      { label: 'Compare to urban-A cohort', hint: 'Isolate urban-A benchmark' },
    ],
  },

  'S-03': {
    primaryColor: 'red',
    chartKind: 'line',
    chartLabel: 'Sec:Pri ratio · 6-month trend',
    chartUnit: '%',
    trend: trend([79, 78, 74, 71, 68, 62], 75),
    intro: 'Monitor pipeline health through primary-to-secondary flow ratios, distributor stock levels, and fill rates to prevent pipeline stuffing.',
    insights: [
      'Sec:Pri ratio dropped to 62% (17pp below target) indicating pipeline stuffing',
      'Days of stock increased to 41 days (+6 vs LM) at distributor level',
      'OFR improved slightly but overall pipeline health is critical'
    ],
    recommendations: [
      'Freeze primary billing at flagged distributors until stock normalizes',
      'Launch targeted liquidation schemes (M05) for aged inventory',
      'Escalate pipeline stuffing finding via war-room (DA-03)'
    ],
    kpis: [
      {
        label: 'Sec:Pri ratio',
        value: '62%',
        delta: '▼ 17pp',
        tone: 'red',
        caption: 'was 79% · target 75%',
        tooltip: 'Secondary sales as % of primary sales. Measures pipeline health. Target: 75-85%.',
        status: 'critical'
      },
      {
        label: 'DMS:Pri',
        value: '71%',
        delta: '▼ 3pp',
        tone: 'red',
        caption: 'coverage of primary',
        tooltip: 'Distributor Management System coverage of primary sales. Tracks distribution reach efficiency.',
        status: 'warning'
      },
      {
        label: 'OFR',
        value: '87.2%',
        delta: '▲ 0.5pp',
        tone: 'green',
        caption: 'order fill rate',
        tooltip: 'Order Fill Rate: % of orders fulfilled completely. Measures supply chain responsiveness.',
        status: 'good'
      },
      {
        label: 'Days of stock',
        value: '41',
        delta: '▲ 6',
        tone: 'red',
        caption: 'inventory at DBs',
        tooltip: 'Average inventory days at distributors. High values indicate pipeline stuffing risk. Target: <30 days.',
        status: 'critical'
      },
    ],
    modules: [
      {
        id: 'dist-leaderboard',
        title: 'Distributor leaderboard',
        desc: 'Top 20 DBs sorted by lowest Sec:Pri ratio.',
      },
      {
        id: 'pri-sec-waterfall',
        title: 'Primary → Secondary waterfall',
        desc: 'Where primary loads are stuck before hitting offtake.',
      },
      {
        id: 'stock-aging',
        title: 'Stock ageing',
        desc: 'Distributor-level inventory >30 / >45 / >60 days.',
      },
    ],
    quickActions: [
      { label: 'Freeze primary billing', hint: 'Hold loading at flagged DBs' },
      { label: 'Trigger liquidation scheme', hint: 'Launch M05 targeted scheme' },
      { label: 'Open war-room on DA-03', hint: 'Escalate the pipeline-stuffing finding' },
      { label: 'Export distributor table', hint: 'Download flagged-DB CSV' },
    ],
  },
}
