import "./styles.css";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { AppLayout } from "erxes-ui";
import manifest from "../../erxes.json" with { type: "json" };
import { Loading } from "./components/States";
import { Navigation, NavigationFooter } from "./modules/Navigation";

const SetsPage = lazy(() =>
  import("./pages/SetsPage").then((module) => ({ default: module.SetsPage })),
);
const SetDetailPage = lazy(() =>
  import("./pages/SetDetailPage").then((module) => ({ default: module.SetDetailPage })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((module) => ({ default: module.SettingsPage })),
);

// core-ui mounts this component at `/<path>/*`; routes below are relative to
// it. It resolves the component by the PascalCase expose name.
export const Homework = () => (
  <AppLayout
    id={manifest.name}
    title={manifest.title}
    sidebar={<Navigation />}
    footer={<NavigationFooter />}
  >
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route index element={<Navigate to="library" replace />} />
        <Route path="library" element={<SetsPage scope="library" />} />
        <Route path="my-sets" element={<SetsPage scope="mine" />} />
        <Route path="sets/:id" element={<SetDetailPage />} />
        <Route path="settings" element={<SettingsPage />} />
        {/* The generator moved into a sheet on the list pages. */}
        <Route path="generate" element={<Navigate to="../library" replace />} />
      </Routes>
    </Suspense>
  </AppLayout>
);
