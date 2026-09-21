// Admin console screenshots for the reports (deliverable B1).
//
//   npm run dev                                            (in another terminal)
//   node docs/report-screens/scripts/capture-admin.mjs
//
// Same shot format as the user manual's shots.mjs — see the header of
// docs/user-manual/scripts/capture.mjs for the step types. Every shot runs as
// the `admin` persona, the only one AdminGuard lets into /admin.

const A = "/admin";

export const SHOTS = [
  {
    id: "admin_01_dashboard", persona: "admin", viewport: [1440, 1030],
    steps: [{ goto: A, wait: 5000 }],
  },
  {
    id: "admin_02_accounts", persona: "admin", viewport: [1440, 1150],
    steps: [{ goto: `${A}/accounts`, wait: 5000 }],
  },
  {
    // The same list filtered to providers, to show the role and status filters
    // doing something.
    id: "admin_03_accounts_filtered", persona: "admin", viewport: [1440, 1000],
    steps: [
      { goto: `${A}/accounts`, wait: 5000 },
      // The two filter selects carry no label or name, so they are picked
      // by position: 0 is the role filter, 1 the status filter.
      { chooseSel: ["select", "Nhà cung cấp"], nth: 0, after: 1200 },
    ],
  },
  {
    // The row menu: view, approve/deactivate/ban, delete.
    id: "admin_04_account_actions", persona: "admin", viewport: [1440, 1000], keepHover: true,
    steps: [
      { goto: `${A}/accounts`, wait: 5000 },
      { clickSel: "button[aria-label='Hành động']", nth: 1, after: 900 },
    ],
  },
  {
    id: "admin_05_account_detail", persona: "admin", viewport: [1440, 1100], clip: "[role=dialog]",
    steps: [
      { goto: `${A}/accounts`, wait: 5000 },
      { clickSel: "button[aria-label='Hành động']", nth: 1, after: 900 },
      { click: "Xem chi tiết", after: 1200 },
    ],
  },
  {
    id: "admin_06_activity", persona: "admin", viewport: [1440, 760],
    steps: [{ goto: `${A}/activity`, wait: 5000 }],
  },
  {
    id: "admin_07_projects", persona: "admin", viewport: [1440, 950],
    steps: [{ goto: `${A}/projects`, wait: 5000 }],
  },
  {
    id: "admin_08_revenue", persona: "admin", viewport: [1440, 1150],
    steps: [{ goto: `${A}/revenue`, wait: 5000 }],
  },
  {
    // Same page with the series grouped by day instead of by month.
    id: "admin_09_revenue_daily", persona: "admin", viewport: [1440, 1000],
    steps: [
      { goto: `${A}/revenue`, wait: 5000 },
      { click: "Theo ngày", selector: "button", exact: true, after: 1500 },
    ],
  },
  {
    id: "admin_10_transactions", persona: "admin", viewport: [1440, 1260],
    steps: [
      { goto: `${A}/revenue`, wait: 5000 },
      { scrollTo: "Giao dịch", offset: -100 },
    ],
  },
];
