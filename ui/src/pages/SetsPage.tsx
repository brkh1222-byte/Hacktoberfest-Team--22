import { useMutation, useQuery } from "@apollo/client";
import {
  IconBooks,
  IconCopy,
  IconFolder,
  IconSearch,
  IconSparkles,
  IconStar,
} from "@tabler/icons-react";
import { useState, type FormEvent } from "react";
import { Badge, Button, Card, Empty, Input, Select, Skeleton, useToast } from "erxes-ui";
import { Link } from "react-router";
import manifest from "../../../erxes.json" with { type: "json" };
import { ErrorState, errorText } from "~/components/States";
import { PageShell } from "~/components/PageShell";
import type { HomeworkSetsQuery, HomeworkSetsQueryVariables } from "~/gql/graphql";
import { SET_COPY_MUTATION, SETS_QUERY } from "~/graphql";
import { mn } from "~/lib/mn";

const { path } = manifest.ui;
const PAGE_SIZE = 12;
const ALL = "all";

type Scope = HomeworkSetsQueryVariables["scope"];
type Filters = Omit<HomeworkSetsQueryVariables, "scope" | "limit" | "offset">;
type SetSummary = HomeworkSetsQuery["homeworkSets"]["list"][number];

const FilterSelect = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) => (
  <Select value={value} onValueChange={onChange}>
    <Select.Trigger aria-label={label} className="homework:w-full homework:sm:w-40">
      <Select.Value />
    </Select.Trigger>
    <Select.Content>
      {options.map(([optionValue, optionLabel]) => (
        <Select.Item key={optionValue} value={optionValue}>
          {optionLabel}
        </Select.Item>
      ))}
    </Select.Content>
  </Select>
);

const SetCard = ({ set, scope }: { set: SetSummary; scope: Scope }) => {
  const { toast } = useToast();
  const [copy, { loading: copying }] = useMutation(SET_COPY_MUTATION, {
    refetchQueries: [SETS_QUERY],
    onCompleted: () => toast({ title: mn.copied }),
    onError: (error) => toast({ variant: "destructive", title: errorText(error) }),
  });

  return (
    <Card className="homework:flex homework:flex-col">
      <Card.Header>
        <div className="homework:flex homework:items-center homework:justify-between homework:gap-2">
          <Badge variant="info">{set.subject}</Badge>
          <span className="homework:text-sm homework:text-muted-foreground">
            {set.grade} {mn.grade}
          </span>
        </div>
        <Card.Title className="homework:leading-snug">
          <Link to={`/${path}/sets/${set._id}`} className="homework:hover:underline">
            {set.title}
          </Link>
        </Card.Title>
        <Card.Description>{set.topic}</Card.Description>
      </Card.Header>
      <Card.Content className="homework:flex homework:flex-1 homework:flex-col homework:gap-3">
        <div className="homework:flex homework:flex-wrap homework:gap-1.5">
          <Badge variant="secondary">{mn.setTypeLabels[set.setType]}</Badge>
          <Badge variant="secondary">{mn.difficultyLabels[set.difficulty]}</Badge>
          <Badge variant="secondary">
            {set.questions.length} {mn.questions}
          </Badge>
          {set.visibility === "private" && <Badge variant="warning">{mn.private}</Badge>}
        </div>
        <p className="homework:text-sm">
          <span className="homework:font-medium">{set.author.fullName}</span>
          {set.author.school && (
            <span className="homework:text-muted-foreground"> · {set.author.school}</span>
          )}
        </p>
        <div className="homework:mt-auto homework:flex homework:items-center homework:justify-between homework:gap-2 homework:text-sm homework:text-muted-foreground">
          <span className="homework:flex homework:items-center homework:gap-3">
            <span className="homework:flex homework:items-center homework:gap-1">
              <IconCopy className="homework:size-4" /> {set.copyCount}
            </span>
            <span className="homework:flex homework:items-center homework:gap-1">
              <IconStar className="homework:size-4" />
              {set.ratingCount ? `${set.ratingAverage.toFixed(1)} (${set.ratingCount})` : mn.noRating}
            </span>
          </span>
          {scope === "library" && !set.isOwner && (
            <Button
              variant="outline"
              size="sm"
              disabled={copying}
              onClick={() => copy({ variables: { _id: set._id } })}
            >
              {copying ? mn.saving : mn.copySet}
            </Button>
          )}
        </div>
      </Card.Content>
    </Card>
  );
};

export const SetsPage = ({ scope }: { scope: Scope }) => {
  const [filters, setFilters] = useState<Filters>({ sort: "newest" });
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const { data, loading, error, refetch } = useQuery(SETS_QUERY, {
    variables: { scope, ...filters, limit: PAGE_SIZE, offset },
    fetchPolicy: "cache-and-network",
  });

  const mine = scope === "mine";
  const result = data?.homeworkSets;
  const setFilter = (patch: Filters) => {
    setFilters({ ...filters, ...patch });
    setOffset(0);
  };
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilter({ search: search.trim() || null });
  };

  return (
    <PageShell
      title={mine ? mn.mySets : mn.library}
      icon={mine ? IconFolder : IconBooks}
      iconName={mine ? "IconFolder" : "IconBooks"}
      to={mine ? `/${path}/my-sets` : `/${path}`}
      actions={
        <Button asChild>
          <Link to={`/${path}/generate`}>
            <IconSparkles />
            {mn.generate}
          </Link>
        </Button>
      }
    >
      <section className="homework:flex homework:flex-col homework:gap-1">
        <h1 className="homework:text-2xl homework:font-semibold homework:tracking-tight">
          {mine ? mn.collectionHeading : mn.libraryHeading}
        </h1>
        <p className="homework:text-sm homework:text-muted-foreground">
          {mine ? mn.collectionIntro : mn.libraryIntro}
        </p>
      </section>

      <Card>
        <Card.Content className="homework:flex homework:flex-col homework:gap-3 homework:pt-4">
          <form onSubmit={submitSearch} className="homework:flex homework:gap-2">
            <Input
              type="search"
              value={search}
              maxLength={150}
              placeholder={mn.searchPlaceholder}
              aria-label={mn.search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button type="submit" variant="secondary">
              <IconSearch />
              {mn.search}
            </Button>
          </form>
          <div className="homework:flex homework:flex-wrap homework:gap-2">
            <FilterSelect
              label={mn.subject}
              value={filters.subject ?? ALL}
              onChange={(value) => setFilter({ subject: value === ALL ? null : value })}
              options={[[ALL, `${mn.subject}: ${mn.all}`], ...mn.subjects.map((s): [string, string] => [s, s])]}
            />
            <FilterSelect
              label={mn.grade}
              value={filters.grade ? String(filters.grade) : ALL}
              onChange={(value) => setFilter({ grade: value === ALL ? null : Number(value) })}
              options={[
                [ALL, `${mn.grade}: ${mn.all}`],
                ...Array.from({ length: 12 }, (_, i): [string, string] => [String(i + 1), `${i + 1} ${mn.grade}`]),
              ]}
            />
            <FilterSelect
              label={mn.setTypeLabels.homework}
              value={filters.setType ?? ALL}
              onChange={(value) =>
                setFilter({ setType: value === ALL ? null : (value as Filters["setType"]) })
              }
              options={[[ALL, mn.all], ...Object.entries(mn.setTypeLabels)]}
            />
            <FilterSelect
              label={mn.difficulty}
              value={filters.difficulty ?? ALL}
              onChange={(value) =>
                setFilter({ difficulty: value === ALL ? null : (value as Filters["difficulty"]) })
              }
              options={[[ALL, `${mn.difficulty}: ${mn.all}`], ...Object.entries(mn.difficultyLabels)]}
            />
            <FilterSelect
              label={mn.sort}
              value={filters.sort ?? "newest"}
              onChange={(value) => setFilter({ sort: value as Filters["sort"] })}
              options={[
                ["newest", mn.newest],
                ["copies", mn.mostCopied],
                ["rating", mn.topRated],
              ]}
            />
          </div>
        </Card.Content>
      </Card>

      {loading && !result ? (
        <div role="status" aria-label={mn.loading} className="homework:grid homework:gap-4 homework:sm:grid-cols-2 homework:lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="homework:h-52" />
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !result?.list.length ? (
        <Empty>
          <Empty.Header>
            <Empty.Media variant="icon">
              <IconBooks />
            </Empty.Media>
            <Empty.Title>{mn.emptyTitle}</Empty.Title>
            <Empty.Description>{mine ? mn.emptyCollection : mn.emptyLibrary}</Empty.Description>
          </Empty.Header>
          <Empty.Content>
            <Button asChild>
              <Link to={`/${path}/generate`}>{mn.generate}</Link>
            </Button>
          </Empty.Content>
        </Empty>
      ) : (
        <>
          <div className="homework:grid homework:gap-4 homework:sm:grid-cols-2 homework:lg:grid-cols-3">
            {result.list.map((set) => (
              <SetCard key={set._id} set={set} scope={scope} />
            ))}
          </div>
          <nav aria-label={mn.page} className="homework:flex homework:items-center homework:justify-center homework:gap-3">
            <Button
              variant="outline"
              disabled={loading || offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              {mn.previous}
            </Button>
            <span className="homework:text-sm homework:text-muted-foreground">
              {mn.page} {offset / PAGE_SIZE + 1} / {Math.max(1, Math.ceil(result.totalCount / PAGE_SIZE))}
            </span>
            <Button
              variant="outline"
              disabled={loading || offset + PAGE_SIZE >= result.totalCount || offset + PAGE_SIZE > 10_000}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              {mn.next}
            </Button>
          </nav>
        </>
      )}
    </PageShell>
  );
};
