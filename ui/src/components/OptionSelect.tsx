import { useState, type ReactNode } from "react";
import {
  Combobox,
  Command,
  Filter,
  PopoverScoped,
  SelectOperationContent,
  SelectTriggerOperation,
  useQueryState,
} from "erxes-ui";
import { mn } from "~/lib/mn";

export type Option = { value: string; label: string };

type Variant = "detail" | "form" | "filter" | "table";

// The command list every variant shares: search + options with a check, the
// same shape erxes plugins use for status/priority pickers.
const OptionList = ({
  options,
  value,
  onSelect,
  placeholder,
}: {
  options: Option[];
  value: string | null | undefined;
  onSelect: (value: string) => void;
  placeholder?: string;
}) => (
  <Command>
    {options.length > 6 && <Command.Input placeholder={placeholder ?? mn.search} />}
    <Command.Empty>{mn.emptyTitle}</Command.Empty>
    <Command.List>
      {options.map((option) => (
        <Command.Item key={option.value} value={`${option.label} ${option.value}`} onSelect={() => onSelect(option.value)}>
          <span className="homework:flex-1">{option.label}</span>
          <Combobox.Check checked={value === option.value} />
        </Command.Item>
      ))}
    </Command.List>
  </Command>
);

const labelOf = (options: Option[], value: string | null | undefined) =>
  options.find((option) => option.value === value)?.label;

/** A property chip or form field that picks one option. */
export const OptionSelect = ({
  options,
  value,
  onValueChange,
  variant = "detail",
  placeholder,
  icon,
  disabled,
}: {
  options: Option[];
  value: string | null | undefined;
  onValueChange: (value: string) => void;
  variant?: Variant;
  placeholder?: string;
  icon?: ReactNode;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const label = labelOf(options, value);

  if (disabled) {
    return (
      <span className="homework:inline-flex homework:h-7 homework:items-center homework:gap-1.5 homework:rounded-md homework:bg-accent homework:px-2 homework:text-sm homework:font-medium">
        {icon}
        {label ?? placeholder}
      </span>
    );
  }

  return (
    <PopoverScoped open={open} onOpenChange={setOpen}>
      <SelectTriggerOperation variant={variant}>
        <span className="homework:flex homework:items-center homework:gap-1.5 homework:truncate">
          {icon}
          {label ?? <span className="homework:text-muted-foreground">{placeholder}</span>}
        </span>
      </SelectTriggerOperation>
      <SelectOperationContent variant={variant}>
        <OptionList
          options={options}
          value={value}
          onSelect={(next) => {
            onValueChange(next);
            setOpen(false);
          }}
        />
      </SelectOperationContent>
    </PopoverScoped>
  );
};

/** The filter popover's view for one URL query key. */
export const OptionFilterView = ({ queryKey, options }: { queryKey: string; options: Option[] }) => {
  const [value, setValue] = useQueryState<string>(queryKey);

  return (
    <Filter.View filterKey={queryKey}>
      <OptionList options={options} value={value} onSelect={setValue} />
    </Filter.View>
  );
};

/** The chip shown in the filter bar once a query key is set. */
export const OptionFilterBarItem = ({
  queryKey,
  label,
  icon,
  options,
}: {
  queryKey: string;
  label: string;
  icon: ReactNode;
  options: Option[];
}) => {
  const [value, setValue] = useQueryState<string>(queryKey);
  const [open, setOpen] = useState(false);

  if (!value) return null;

  return (
    <Filter.BarItem queryKey={queryKey}>
      <Filter.BarName>
        {icon}
        {label}
      </Filter.BarName>
      <PopoverScoped open={open} onOpenChange={setOpen}>
        <SelectTriggerOperation variant="filter">{labelOf(options, value) ?? value}</SelectTriggerOperation>
        <SelectOperationContent variant="filter">
          <OptionList
            options={options}
            value={value}
            onSelect={(next) => {
              setValue(next);
              setOpen(false);
            }}
          />
        </SelectOperationContent>
      </PopoverScoped>
    </Filter.BarItem>
  );
};
