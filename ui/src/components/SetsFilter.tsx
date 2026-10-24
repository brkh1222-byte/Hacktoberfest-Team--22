import {
  IconArrowsSort,
  IconBook,
  IconCategory,
  IconChartBar,
  IconSchool,
  IconSearch,
} from "@tabler/icons-react";
import { Combobox, Command, Filter, useMultiQueryState } from "erxes-ui";
import { mn } from "~/lib/mn";
import {
  DIFFICULTY_OPTIONS,
  GRADE_OPTIONS,
  SET_TYPE_OPTIONS,
  SORT_OPTIONS,
  SUBJECT_OPTIONS,
} from "~/lib/options";
import { OptionFilterBarItem, OptionFilterView } from "./OptionSelect";

export const SET_FILTER_KEYS = ["search", "subject", "grade", "setType", "difficulty", "sort"] as const;

export type SetFilterQuery = Record<(typeof SET_FILTER_KEYS)[number], string>;

export const SETS_SESSION_KEY = "homework_sets_cursor";

const FILTERS = [
  { key: "subject", label: mn.subject, icon: <IconBook />, options: SUBJECT_OPTIONS },
  { key: "grade", label: mn.grade, icon: <IconSchool />, options: GRADE_OPTIONS },
  { key: "setType", label: mn.setTypeLabels.homework, icon: <IconCategory />, options: SET_TYPE_OPTIONS },
  { key: "difficulty", label: mn.difficulty, icon: <IconChartBar />, options: DIFFICULTY_OPTIONS },
  { key: "sort", label: mn.sort, icon: <IconArrowsSort />, options: SORT_OPTIONS },
];

// Filters live in the URL, as in every erxes list, so a filtered library can
// be bookmarked or shared.
export const SetsFilter = ({ totalCount }: { totalCount: number | undefined }) => {
  const [queries] = useMultiQueryState<SetFilterQuery>([...SET_FILTER_KEYS]);
  const filtered = Object.values(queries).some((value) => value !== null);

  return (
    <Filter id="homework-sets-filter" sessionKey={SETS_SESSION_KEY}>
      <Filter.Bar>
        <Filter.Popover>
          <Filter.Trigger isFiltered={filtered} />
          <Combobox.Content>
            <Filter.View>
              <Command>
                <Filter.CommandInput placeholder={mn.search} variant="secondary" className="homework:bg-background" />
                <Command.List className="homework:p-1">
                  <Filter.Item value="search" inDialog>
                    <IconSearch />
                    {mn.search}
                  </Filter.Item>
                  <Command.Separator className="homework:my-1" />
                  {FILTERS.map((filter) => (
                    <Filter.Item key={filter.key} value={filter.key}>
                      {filter.icon}
                      {filter.label}
                    </Filter.Item>
                  ))}
                </Command.List>
              </Command>
            </Filter.View>
            {FILTERS.map((filter) => (
              <OptionFilterView key={filter.key} queryKey={filter.key} options={filter.options} />
            ))}
          </Combobox.Content>
        </Filter.Popover>
        <Filter.Dialog>
          <Filter.View filterKey="search" inDialog>
            <Filter.DialogStringView filterKey="search" />
          </Filter.View>
        </Filter.Dialog>

        {queries.search && (
          <Filter.BarItem queryKey="search">
            <Filter.BarName>
              <IconSearch />
              {mn.search}
            </Filter.BarName>
            <Filter.BarButton filterKey="search" inDialog>
              {queries.search}
            </Filter.BarButton>
          </Filter.BarItem>
        )}
        {FILTERS.map((filter) => (
          <OptionFilterBarItem
            key={filter.key}
            queryKey={filter.key}
            label={filter.label}
            icon={filter.icon}
            options={filter.options}
          />
        ))}
        <div className="homework:h-7 homework:whitespace-nowrap homework:text-sm homework:font-medium homework:leading-7 homework:text-muted-foreground">
          {totalCount === undefined ? "" : `${totalCount} ${mn.sets}`}
        </div>
      </Filter.Bar>
    </Filter>
  );
};
