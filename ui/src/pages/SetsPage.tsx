import { IconBooks, IconFolder } from "@tabler/icons-react";
import { Breadcrumb, Button } from "erxes-ui";
import { FavoriteToggleIconButton, PageHeader } from "ui-modules";
import { Link } from "react-router";
import manifest from "../../../erxes.json" with { type: "json" };
import { GenerateSheet } from "~/components/GenerateSheet";
import { SetsTable } from "~/components/SetsTable";
import type { HomeworkSetsQueryVariables } from "~/gql/graphql";
import { mn } from "~/lib/mn";

const { path } = manifest.ui;

type Scope = HomeworkSetsQueryVariables["scope"];

export const SCOPE_PAGES = {
  library: { label: mn.library, icon: IconBooks, iconName: "IconBooks", to: `/${path}/library` },
  mine: { label: mn.mySets, icon: IconFolder, iconName: "IconFolder", to: `/${path}/my-sets` },
} as const;

export const ScopeBreadcrumb = ({ scope }: { scope: Scope }) => {
  const { label, icon: Icon, to } = SCOPE_PAGES[scope];

  return (
    <Breadcrumb.Item>
      <Button variant="ghost" asChild>
        <Link to={to}>
          <Icon />
          {label}
        </Link>
      </Button>
    </Breadcrumb.Item>
  );
};

export const SetsPage = ({ scope }: { scope: Scope }) => {
  const { label, iconName } = SCOPE_PAGES[scope];

  return (
    <>
      <PageHeader>
        <PageHeader.Start>
          <Breadcrumb>
            <Breadcrumb.List className="homework:gap-1">
              <ScopeBreadcrumb scope={scope} />
              <Breadcrumb.Item className="homework:ml-1">
                <FavoriteToggleIconButton breadcrumb={[manifest.title, label]} icon={iconName} />
              </Breadcrumb.Item>
            </Breadcrumb.List>
          </Breadcrumb>
        </PageHeader.Start>
        <PageHeader.End>
          <GenerateSheet />
        </PageHeader.End>
      </PageHeader>
      <SetsTable scope={scope} />
    </>
  );
};
