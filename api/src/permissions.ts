import type { IPermissionConfig } from "erxes-api-shared/core-types";
import { manifest } from "./config.ts";

// Action names are global across the platform, not local to this plugin.
export const SETS_READ = "homeworkSetsRead";
export const SETS_MANAGE = "homeworkSetsManage";
export const GENERATE = "homeworkGenerate";

// Every action is checked with checkPermission in the resolver. Ownership is
// enforced on top of that in the models: a teacher only ever changes their own
// sets and only reads other teachers' public ones, so the single `all` scope
// means "this tenant", never "other teachers' private sets".
export const permissions: IPermissionConfig = {
  plugin: manifest.name,
  modules: [
    {
      name: "homeworkSets",
      description: "Exercise sets and homework",
      scopeField: null,
      ownerFields: [],
      scopes: [{ name: "all", description: "Within this organization" }],
      actions: [
        {
          name: SETS_READ,
          title: "View exercise sets",
          description: "Browse the shared library and your own collection, print and export",
        },
        {
          name: SETS_MANAGE,
          title: "Manage exercise sets",
          description: "Save, edit, publish, copy, rate and delete your own sets",
        },
        {
          name: GENERATE,
          title: "Generate with AI",
          description: "Generate exercise sets from lesson text or PDFs (uses the AI provider)",
        },
      ],
    },
  ],
  defaultGroups: [
    {
      id: `${manifest.name}:teacher`,
      name: "Teacher",
      description: "Generate, save and share exercise sets",
      permissions: [
        {
          plugin: manifest.name,
          module: "homeworkSets",
          actions: [SETS_READ, SETS_MANAGE, GENERATE],
          scope: "all",
        },
      ],
    },
    {
      id: `${manifest.name}:viewer`,
      name: "Homework viewer",
      description: "Browse and print shared exercise sets",
      permissions: [
        {
          plugin: manifest.name,
          module: "homeworkSets",
          actions: [SETS_READ],
          scope: "all",
        },
      ],
    },
  ],
};
