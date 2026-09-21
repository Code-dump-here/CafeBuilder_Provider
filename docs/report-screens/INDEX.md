# Screen index

Screenshots taken for the reports (deliverable B1). Vietnamese interface, 1440 px wide,
captured from the running app in demo mode — no backend, no real accounts.

Use case codes follow the Administration group of Report 7's `Figure 19 – Use cases by area`
(UC-51…55); check them against the report before pasting, since the mapping below is the
obvious one rather than a quoted one.

## Admin console (web)

| File | Screen | Role | Route | UC |
|---|---|---|---|---|
| admin_01_dashboard.png | Bảng điều khiển — platform totals, status breakdowns, quick actions | Admin | `/admin` | UC-51 |
| admin_02_accounts.png | Tài khoản — the account list | Admin | `/admin/accounts` | UC-52 |
| admin_03_accounts_filtered.png | Tài khoản filtered to providers | Admin | `/admin/accounts` | UC-52 |
| admin_04_account_actions.png | Row menu: view, deactivate, ban, delete | Admin | `/admin/accounts` | UC-52 |
| admin_05_account_detail.png | Chi tiết tài khoản — the account drawer | Admin | `/admin/accounts` | UC-52 |
| admin_06_activity.png | Hoạt động — the audit feed | Admin | `/admin/activity` | UC-53 |
| admin_07_projects.png | Quản lý dự án — project oversight | Admin | `/admin/projects` | UC-54 |
| admin_08_revenue.png | Doanh thu — monthly series and revenue by purpose | Admin | `/admin/revenue` | UC-55 |
| admin_09_revenue_daily.png | Doanh thu grouped by day | Admin | `/admin/revenue` | UC-55 |
| admin_10_transactions.png | Giao dịch — the transaction table | Admin | `/admin/revenue` | UC-55 |

## What is real and what is not

Three of the five pages read the live admin API (`AdminController`), so the fields, filters and
statuses in those figures are the real ones — only the values come from fixtures:

- `/admin` → `GET /api/admin/overview`
- `/admin/accounts` → `GET /api/admin/accounts`, `GET /api/admin/accounts/{id}`
- `/admin/revenue` → `GET /api/admin/revenue`, `GET /api/admin/revenue/transactions`

Two pages have no backend behind them at all and render from `lib/admin/admin-mock-data.ts`:

- **`/admin/activity`** — there is no activity or audit-log endpoint.
- **`/admin/projects`** — there is no admin project endpoint; its **Mẫu quy trình** and
  **Dự án mới** buttons do nothing.

Describe those two as screens only. Do not quote their numbers in any report, and do not write
requirements for the buttons.
