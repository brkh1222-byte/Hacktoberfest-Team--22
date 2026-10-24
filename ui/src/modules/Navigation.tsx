import { IconBooks, IconFolder, IconSettings, IconSparkles } from "@tabler/icons-react";
// Root import on purpose: core-ui shares `erxes-ui` as a Module Federation
// singleton keyed on the bare specifier, so deep imports would bundle a second
// private copy instead of reusing the host's.
import { NavigationMenuLinkItem, Sidebar } from "erxes-ui";
import manifest from "../../../erxes.json" with { type: "json" };
import { mn } from "../lib/mn";

const { path } = manifest.ui;

export const Navigation = () => (
  <Sidebar.Group>
    <Sidebar.GroupContent>
      <Sidebar.Menu>
        <NavigationMenuLinkItem name={mn.library} icon={IconBooks} path={`/${path}`} />
        <NavigationMenuLinkItem name={mn.mySets} icon={IconFolder} path={`/${path}/my-sets`} />
        <NavigationMenuLinkItem name={mn.generate} icon={IconSparkles} path={`/${path}/generate`} />
        <NavigationMenuLinkItem name={mn.settings} icon={IconSettings} path={`/${path}/settings`} />
      </Sidebar.Menu>
    </Sidebar.GroupContent>
  </Sidebar.Group>
);
