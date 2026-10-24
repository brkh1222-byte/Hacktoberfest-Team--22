import "./styles.css";
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import { AppLayout } from "erxes-ui";
import manifest from "../../erxes.json" with { type: "json" };
import { Loading } from "./components/States";
import { Navigation } from "./modules/Navigation";

const SetsPage = lazy(() =>
  import("./pages/SetsPage").then((module) => ({ default: module.SetsPage })),
);
const GeneratePage = lazy(() =>
  import("./pages/GeneratePage").then((module) => ({ default: module.GeneratePage })),
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
  <AppLayout id={manifest.name} title={manifest.title} sidebar={<Navigation />}>
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route index element={<SetsPage scope="library" />} />
        <Route path="my-sets" element={<SetsPage scope="mine" />} />
        <Route path="generate" element={<GeneratePage />} />
        <Route path="sets/:id" element={<SetDetailPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Routes>
    </Suspense>
  </AppLayout>
);
