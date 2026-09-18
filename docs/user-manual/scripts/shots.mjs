// The user manual's screenshots, in manual order. Each id is the image's file
// name in ../images and matches the figure reference in USER_MANUAL.md.
//
//   persona   demo account to use (default "both"; see lib/http/demo-mode.ts)
//   stage     "signed" (default) or "unsigned" — Nhà Nâu before its contract
//   steps     what to do before the capture:
//             { goto }, { click, within?, nth?, exact? }, { clickSel }, { fill: [field, value] },
//             { choose: [select, option] }, { type }, { key }, { scrollTo, offset? }, { scrollY }, { wait }, { eval }
//   clip      capture one element instead of the viewport ("[role=dialog]", "text:…")
//   viewport  [width, height], default 1440 × 900

const P = "/projects/11111111-1111-4111-8111-111111111111";
const BAKERY = "/projects/88888888-8888-4888-8888-888888888888";
const GOC_SAN = "/projects/99999999-9999-4999-8999-999999999999";

export const SHOTS = [
  // ── 1 Getting around ──────────────────────────────────────────────────────
  { id: "01-01-homepage", steps: [{ goto: "/", wait: 4500 }] },
  {
    id: "01-02-user-menu",
    steps: [{ goto: "/my-projects", wait: 3500 }, { clickSel: "[aria-label='Mở menu người dùng']" }],
  },
  {
    id: "01-03-workspace",
    steps: [{ goto: P, wait: 4000 }],
  },
  ...[
    ["01-04-sidebar-both", "both", ["Thông tin dự án", "Công việc thiết kế", "Không gian làm việc", "Vấn đề & RFI", "Tin nhắn"]],
    ["01-05-sidebar-designer", "designer", ["Thông tin dự án", "Công việc thiết kế", "Vấn đề & RFI", "Tin nhắn"]],
    ["01-06-sidebar-contractor", "contractor", ["Thông tin dự án", "Không gian làm việc", "Vấn đề & RFI", "Tin nhắn"]],
  ].map(([id, persona, groups]) => ({
    id, persona, clip: "[data-slot=sidebar-inner]", pad: 0, viewport: [1440, 820],
    // Every group opened, so the whole menu for this role is visible.
    steps: [
      { goto: P, wait: 4500 },
      ...groups.map((group) => ({ click: group, selector: "[data-sidebar=group-label]", after: 500 })),
    ],
  })),

  // ── 2 Account ─────────────────────────────────────────────────────────────
  {
    id: "02-01-register", persona: "guest",
    steps: [
      { goto: "/register" },
      { fill: ["fullname", "Nguyễn Văn Bình"] },
      { fill: ["email", "lienhe@xuongmocbinhminh.vn"] },
      { fill: ["phone", "0908123456"] },
      { fill: ["password", "Matkhau@2026"] },
      { click: "Tạo tài khoản SmartCafeBuilder", selector: "h1, h2" },
    ],
  },
  {
    id: "02-02-send-code", persona: "onboarding",
    steps: [{ goto: "/onboarding", wait: 3500 }],
  },
  {
    id: "02-03-enter-code", persona: "onboarding",
    steps: [
      { goto: "/onboarding", wait: 3500 },
      { click: "Gửi mã xác minh", after: 1500 },
      { clickSel: "input[inputmode=numeric], input[maxlength='1']" },
      { type: "482916" },
    ],
  },
  {
    id: "02-04-complete-profile", persona: "onboarding", viewport: [1440, 1420],
    steps: [
      { goto: "/onboarding", wait: 3500 },
      { click: "Gửi mã xác minh", after: 1500 },
      { clickSel: "input[inputmode=numeric], input[maxlength='1']" },
      { type: "482916" },
      { click: "Xác minh & Tiếp tục", after: 2000 },
      { fill: ["displayName", "Xưởng Mộc Bình Minh"] },
      { click: "Doanh nghiệp", exact: false },
      { click: "Cả hai", exact: false },
      { fill: ["bio", "Design-and-build studio working on cafés across Ho Chi Minh City."] },
      { fill: ["yearsExperience", "8"] },
      { fill: ["portfolioHeadline", "Timber-forward cafés, from brief to handover"] },
      { fill: ["companyTaxCode", "0312345678"] },
      { scrollY: 0 },
    ],
  },
  {
    id: "02-05-login", persona: "guest",
    steps: [
      { goto: "/login" },
      { fill: ["email", "lienhe@xuongmocbinhminh.vn"] },
      { fill: ["password", "Matkhau@2026"] },
      { click: "Đăng nhập vào SmartCafeBuilder", selector: "h1, h2" },
    ],
  },
  {
    id: "02-06-sign-out",
    steps: [{ goto: "/my-projects", wait: 3500 }, { clickSel: "[aria-label='Mở menu người dùng']" }],
    clip: "[role=menu]", pad: 8,
  },

  // ── 3 Provider profile ────────────────────────────────────────────────────
  { id: "03-01-profile", steps: [{ goto: "/profile", wait: 4000 }] },
  {
    id: "03-02-edit-profile", clip: "[role=dialog]",
    steps: [
      { goto: "/profile", wait: 4000 },
      { click: "Chỉnh sửa", exact: true, after: 1200 },
      { eval: "document.getSelection()?.removeAllRanges(); document.activeElement?.blur()" },
    ],
  },
  {
    id: "03-03-add-past-work", clip: "[role=dialog]",
    steps: [
      { goto: "/profile", wait: 4000 },
      { click: "Thêm công trình đã làm", after: 1200 },
      { fill: ["Tên công trình", "Cà phê Nhà Gỗ — Quận 3"], within: "dialog" },
      { fill: ["Phong cách", "Warm industrial"], within: "dialog" },
      { fill: ["Địa điểm", "Quận 3, Hồ Chí Minh"], within: "dialog" },
      { fill: ["Diện tích", "64"], within: "dialog" },
      { fill: ["Giá trị hợp đồng", "310000000"], within: "dialog" },
    ],
  },
  {
    id: "03-04-brand", viewport: [1440, 1500],
    steps: [{ goto: "/profile", wait: 4000 }, { click: "Thương hiệu", selector: "button", after: 2000 }],
  },
  {
    id: "03-05-reviews",
    steps: [{ goto: "/profile", wait: 4000 }, { click: "Đánh giá", selector: "button", after: 2000 }, { scrollTo: "Dự án mẫu", offset: -120 }],
  },
  {
    id: "03-06-public-profile",
    steps: [{ goto: "/providers/00000000-0000-4000-8000-000000000002", wait: 5000 }],
  },

  // ── 4 Finding work ────────────────────────────────────────────────────────
  { id: "04-01-marketplace", viewport: [1440, 1100], steps: [{ goto: "/marketplace", wait: 4500 }] },
  { id: "04-02-brief", viewport: [1440, 1100], steps: [{ goto: BAKERY, wait: 5000 }] },
  {
    id: "04-03-apply", clip: "[role=dialog]",
    steps: [
      { goto: BAKERY, wait: 5000 },
      { click: "Ứng tuyển ngay", after: 1200 },
      { fill: ["Đề xuất của bạn", "We design and build bakery-cafés with open kitchens — Bếp Nhà Lúa in Quận 7 is ours. We would start with a site survey, then send a layout and a priced quotation within two weeks."], within: "dialog" },
      { fill: ["Thời lượng dự kiến", "75"], within: "dialog" },
    ],
  },
  { id: "04-04-bid-submitted", viewport: [1440, 1100], steps: [{ goto: GOC_SAN, wait: 5000 }, { scrollTo: "Đã gửi hồ sơ ứng tuyển", offset: -300 }] },
  { id: "04-05-my-projects", steps: [{ goto: "/my-projects", wait: 5000 }] },
  { id: "04-06-invitations", steps: [{ goto: "/my-projects?status=requested", wait: 5000 }] },

  // ── 5 Working on a project ────────────────────────────────────────────────
  { id: "05-01-overview", viewport: [1440, 1000], steps: [{ goto: P, wait: 5000 }] },
  { id: "05-02-site-profile", viewport: [1440, 1300], steps: [{ goto: `${P}/site-profile`, wait: 5000 }] },
  { id: "05-03-quotations", viewport: [1440, 1100], steps: [{ goto: `${P}/quotations`, wait: 5000 }] },
  {
    id: "05-04-create-quotation", clip: "[role=dialog]", viewport: [1440, 1500],
    steps: [
      { goto: `${GOC_SAN}/quotations`, wait: 5000 },
      { click: "Lập báo giá", selector: "button", after: 1500 },
      { fill: ["Tiêu đề báo giá", "Fit-out of both floors and terrace"], within: "dialog" },
      { fill: ["Thời gian", "63"], within: "dialog" },
      { fill: ["Tên hạng mục", "Terrace decking and railing"], within: "dialog" },
      { fill: ["Đơn giá", "86000000"], within: "dialog" },
      { eval: "document.activeElement?.blur()" },
    ],
  },
  { id: "05-05-contracts", steps: [{ goto: `${P}/contracts`, wait: 5000 }] },
  {
    id: "05-06-create-contract", stage: "unsigned", clip: "[role=dialog]", viewport: [1440, 1500],
    steps: [
      { goto: `${P}/contracts`, wait: 5000 },
      { click: "Hợp đồng mới", selector: "button", after: 1500 },
      { fill: ["Tiêu đề hợp đồng", "Design & build — Ground floor fit-out"], within: "dialog" },
      { choose: ["Dựng từ báo giá", "revised after site survey"], within: "dialog", after: 1000 },
      { fill: ["Điều khoản", "Payment in four instalments against milestones, as in the approved quotation."], within: "dialog" },
      { eval: "document.activeElement?.blur()" },
    ],
  },
  { id: "05-07-payments", viewport: [1440, 1200], steps: [{ goto: `${P}/payments`, wait: 5000 }] },
  {
    id: "05-08-confirm-payment", clip: "[role=alertdialog],[role=dialog]",
    steps: [{ goto: `${P}/payments`, wait: 5000 }, { click: "Xác nhận đã nhận", selector: "button", after: 1200 }],
  },
  {
    id: "05-09-reject-proof", clip: "[role=dialog]",
    steps: [
      { goto: `${P}/payments`, wait: 5000 },
      { click: "Bác minh chứng", selector: "button", after: 1200 },
      { fill: ["Lý do", "The transfer reference does not match instalment 2."], within: "dialog" },
    ],
  },
  {
    id: "05-10-link-milestone", clip: "[role=dialog]", viewport: [1440, 1000],
    steps: [
      { goto: `${P}/payments`, wait: 5000 },
      { click: "Gắn hạng mục", selector: "button", after: 1500 },
      { click: "Không gắn hạng mục", within: "dialog", selector: "button, [role=combobox]", after: 800 },
      { click: "Electrical first fix", selector: "[role=option]", after: 800 },
    ],
  },
  { id: "05-11-change-orders", viewport: [1440, 1100], steps: [{ goto: `${P}/change-orders`, wait: 5000 }] },
  {
    id: "05-12-create-change-order", clip: "[role=dialog]",
    steps: [
      { goto: `${P}/change-orders`, wait: 5000 },
      { click: "Lập khoản phát sinh", selector: "button", after: 1500 },
      { fill: ["Tiêu đề", "Add a kitchen extraction hood"], within: "dialog" },
      { fill: ["Số tiền", "18500000"], within: "dialog" },
      { fill: ["Lý do", "The owner added a hot menu after the walkthrough, so the kitchen now needs extraction to the roof."], within: "dialog" },
      { eval: "document.activeElement?.blur()" },
    ],
  },
  {
    id: "05-13-messages", viewport: [1440, 960],
    steps: [
      { goto: `${P}/messages`, wait: 5000 },
      { click: "Bar carcass & plumbing", selector: "button, [role=button], li, a", after: 2500 },
      { fill: ["Nhắn cho", "Pressure test passed — photos in the daily log."] },
    ],
  },
  {
    id: "05-14-new-thread", clip: "[role=dialog]",
    steps: [
      { goto: `${P}/messages`, wait: 5000 },
      { click: "Thread mới", selector: "button", after: 1200 },
      { fill: ["VD: Thảo luận", "Lighting samples for the bar"], within: "dialog" },
    ],
  },
  {
    id: "05-15-propose-ending", clip: "[role=alertdialog],[role=dialog]",
    steps: [{ goto: P, wait: 5000 }, { click: "Đề nghị huỷ hợp tác", selector: "button", after: 1200 }],
  },

  // ── 6 Design work ─────────────────────────────────────────────────────────
  { id: "06-01-survey", persona: "designer", viewport: [1440, 1000], steps: [{ goto: `${P}/survey`, wait: 5000 }, { scrollTo: "Khảo sát công trường", offset: -110 }] },
  {
    id: "06-02-new-survey", persona: "designer", clip: "[role=dialog]", viewport: [1440, 1100],
    steps: [
      { goto: `${P}/survey`, wait: 5000 },
      { click: "Khảo sát mới", selector: "button", after: 1500 },
      { fill: ["Điều kiện công trường", "Measured 12.4 × 7.0 m. Existing counter still in place; waste outlet 40 cm from the rear wall."], within: "dialog" },
      { eval: "document.activeElement?.blur()" },
    ],
  },
  { id: "06-03-design-list", persona: "designer", steps: [{ goto: `${P}/design-management`, wait: 5000 }] },
  {
    id: "06-04-new-version", persona: "designer", clip: "[role=dialog]",
    steps: [
      { goto: `${P}/design-management`, wait: 5000 },
      { click: "Tạo phiên bản mới", selector: "button", after: 1200 },
      { fill: ["Tên phiên bản", "Bar elevation — till moved west"], within: "dialog" },
      { fill: ["Ghi chú", "Moves the till 900 mm away from the service door, as the owner asked."], within: "dialog" },
      { eval: "document.activeElement?.blur()" },
    ],
  },
  { id: "06-05-design-detail", persona: "designer", steps: [{ goto: `${P}/design-management/d2`, wait: 6000 }] },
  { id: "06-06-design-submit", persona: "designer", steps: [{ goto: `${P}/design-management/d4`, wait: 6000 }] },
  { id: "06-07-technical-drawings", persona: "designer", steps: [{ goto: `${P}/technical-drawings`, wait: 5000 }] },

  // ── 7 Construction work ───────────────────────────────────────────────────
  { id: "07-01-construction-overview", persona: "contractor", viewport: [1440, 1100], steps: [{ goto: `${P}/construction-overview`, wait: 6000 }] },
  {
    id: "07-02-phase-drawer", persona: "contractor",
    steps: [{ goto: `${P}/construction-overview`, wait: 6000 }, { click: "Mở chi tiết mốc", selector: "button", after: 2500 }],
  },
  { id: "07-03-milestones", persona: "contractor", viewport: [1440, 1100], steps: [{ goto: `${P}/milestones`, wait: 6000 }] },
  {
    id: "07-04-add-phase", persona: "contractor", clip: "[role=dialog]", viewport: [1440, 1100],
    steps: [{ goto: `${P}/milestones`, wait: 6000 }, { click: "Thêm mốc", selector: "button", after: 1500 }],
  },
  {
    id: "07-05-apply-template", persona: "contractor", clip: "[role=dialog]", viewport: [1440, 1100],
    steps: [
      { goto: `${P}/milestones`, wait: 6000 },
      { click: "Áp mẫu quy trình", selector: "button", after: 2500 },
      { click: "Café fit-out — 60 to 120 m²", within: "dialog", after: 600 },
      { click: "Xem các hạng mục", within: "dialog", after: 800 },
      { eval: "document.activeElement?.blur()" },
    ],
  },
  {
    id: "07-06-add-task", persona: "contractor", clip: "[role=dialog]", viewport: [1440, 1100],
    steps: [
      { goto: `${P}/milestones`, wait: 6000 },
      { click: "Thêm", exact: true, selector: "button", nth: 1, after: 1500 },
      { fill: ["Tiêu đề", "Fit bar sink and mixer tap"], within: "dialog" },
      { fill: ["Mô tả", "Undermount sink under the quartz top; tap on the left of the bar."], within: "dialog" },
      { fill: ["Dự toán nhân công", "1200000"], within: "dialog" },
      { eval: "document.activeElement?.blur()" },
    ],
  },
  {
    id: "07-07-checklist", persona: "contractor", clip: "[role=dialog]", viewport: [1440, 1100],
    steps: [{ goto: `${P}/milestones`, wait: 6000 }, { clickSel: "[aria-label='Checklist nghiệm thu']", nth: 1, after: 2500 }],
  },
  {
    id: "07-08-materials", persona: "contractor", clip: "[role=dialog]", viewport: [1440, 1100],
    steps: [{ goto: `${P}/milestones`, wait: 6000 }, { clickSel: "[aria-label='Vật tư']", nth: 1, after: 2500 }],
  },
  { id: "07-09-daily-log", persona: "contractor", viewport: [1440, 1100], steps: [{ goto: `${P}/daily-logs`, wait: 6000 }] },
  {
    id: "07-10-new-log-entry", persona: "contractor", clip: "[role=dialog]", viewport: [1440, 1200],
    steps: [
      { goto: `${P}/daily-logs`, wait: 6000 },
      { click: "Ghi nhật ký", selector: "button", after: 1800 },
      { fill: ["Công việc đã làm", "Pressure-tested the bar plumbing at 6 bar for 30 minutes — no drop. Fitted the sink and tap."], within: "dialog" },
      { fill: ["Vấn đề phát sinh", "None today."], within: "dialog" },
      { fill: ["Thời tiết", "Sunny, 32°C"], within: "dialog" },
      { fill: ["Số thợ", "4"], within: "dialog" },
      { eval: "document.activeElement?.blur()" },
    ],
  },
  {
    id: "07-11-issues", persona: "contractor",
    steps: [{ goto: `${P}/issues`, wait: 6000 }, { click: "Waste pipe runs through the bar carcass return", selector: "div, li, button, [role=button]", after: 2500 }],
  },
  {
    id: "07-12-report-issue", persona: "contractor", clip: "[role=dialog]", viewport: [1440, 1100],
    steps: [
      { goto: `${P}/issues`, wait: 6000 },
      { click: "Báo cáo vấn đề", selector: "button", after: 1800 },
      { choose: ["Loại vấn đề", "MEP clash"], within: "dialog" },
      { fill: ["Nguyên nhân", "Waste pipe runs through the bar carcass return."], within: "dialog" },
      { fill: ["Lý do", "The floor gully is 150 mm further west than on the survey drawing."], within: "dialog" },
      { fill: ["Giải pháp", "Re-route the waste under the floor and notch the carcass base."], within: "dialog" },
      { eval: "document.activeElement?.blur()" },
    ],
  },

  // ── 8 Notifications ───────────────────────────────────────────────────────
  { id: "08-01-notifications", steps: [{ goto: "/notifications", wait: 5000 }] },
  {
    id: "08-02-bell", clip: "[role=menu]",
    steps: [{ goto: "/my-projects", wait: 5000 }, { clickSel: "button[aria-label='Thông báo']", after: 1800 }],
  },

  // ── 9 Subscription ────────────────────────────────────────────────────────
  { id: "09-01-pricing", viewport: [1440, 1100], steps: [{ goto: "/pricing", wait: 5000 }] },
  { id: "09-02-checkout", steps: [{ goto: "/subscription/checkout?planId=plan-studio-month", wait: 5000 }] },
  { id: "09-03-payment-result", steps: [{ goto: "/subscription/return?orderCode=260914001&status=PAID", wait: 6000 }] },
];
