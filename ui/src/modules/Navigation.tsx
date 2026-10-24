import { IconBooks, IconFolder, IconSettings } from "@tabler/icons-react";
// Root import on purpose: core-ui shares `erxes-ui` as a Module Federation
// singleton keyed on the bare specifier, so deep imports would bundle a second
// private copy instead of reusing the host's.
import { AppLayoutFooterLink, NavigationMenuLinkItem, Sidebar } from "erxes-ui";
import manifest from "../../../erxes.json" with { type: "json" };
import { mn } from "../lib/mn";

const { path } = manifest.ui;

export const Navigation = () => (
  <Sidebar.Group className="homework:px-2 homework:py-1">
    <Sidebar.GroupContent>
      <Sidebar.Menu>
        <NavigationMenuLinkItem name={mn.library} icon={IconBooks} pathPrefix={path} path="library" />
        <NavigationMenuLinkItem name={mn.mySets} icon={IconFolder} pathPrefix={path} path="my-sets" />
      </Sidebar.Menu>
    </Sidebar.GroupContent>
  </Sidebar.Group>
);

/** Pinned to the bottom of the app sidebar, like other erxes plugins' settings. */
export const NavigationFooter = () => (
  <AppLayoutFooterLink path={`${path}/settings`} name={mn.settings} icon={IconSettings} />
);
