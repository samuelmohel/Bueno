// Replace the entire content of apps/web/src/app/dashboard/page.tsx with this.
// It loads the real dashboard component (dashboard-page.tsx) which already
// exists in the same folder — it was just never connected.

import DashboardPageComponent from './dashboard-page';

export default function DashboardPage() {
  return <DashboardPageComponent />;
}
