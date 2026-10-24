import { useQuery } from "@apollo/client";
import {
  IconBook,
  IconCategory,
  IconChartBar,
  IconCopy,
  IconEye,
  IconHash,
  IconLabelFilled,
  IconSchool,
  IconStar,
  IconUser,
} from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Badge,
  PageSubHeader,
  RecordTable,
  RecordTableInlineCell,
  TextOverflowTooltip,
  useMultiQueryState,
} from "erxes-ui";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import manifest from "../../../erxes.json" with { type: "json" };
import type { HomeworkSetsQuery, HomeworkSetsQueryVariables } from "~/gql/graphql";
import { SETS_QUERY } from "~/graphql";
import { mn } from "~/lib/mn";
import { EmptyState } from "./States";
import { SET_FILTER_KEYS, SetsFilter, type SetFilterQuery } from "./SetsFilter";

type Scope = HomeworkSetsQueryVariables["scope"];
type SetRow = HomeworkSetsQuery["homeworkSets"]["list"][number];

const PAGE_SIZE = 30;
const { path } = manifest.ui;

const Text = ({ children }: { children: ReactNode }) => (
  <RecordTableInlineCell>
    <span className="homework:truncate">{children}</span>
  </RecordTableInlineCell>
);

const columns = (openSet: (id: string) => void): ColumnDef<SetRow>[] => [
  {
    id: "title",
    accessorKey: "title",
    header: () => <RecordTable.InlineHead label={mn.title} icon={IconLabelFilled} />,
    cell: ({ row }) => (
      <RecordTableInlineCell
        className="homework:cursor-pointer homework:font-medium homework:hover:underline"
        onClick={() => openSet(row.original._id)}
      >
        <TextOverflowTooltip value={row.original.title} />
      </RecordTableInlineCell>
    ),
    size: 280,
  },
  {
    id: "subject",
    accessorKey: "subject",
    header: () => <RecordTable.InlineHead label={mn.subject} icon={IconBook} />,
    cell: ({ row }) => (
      <RecordTableInlineCell>
        <Badge variant="secondary">{row.original.subject}</Badge>
      </RecordTableInlineCell>
    ),
    size: 150,
  },
  {
    id: "grade",
    accessorKey: "grade",
    header: () => <RecordTable.InlineHead label={mn.grade} icon={IconSchool} />,
    cell: ({ row }) => <Text>{row.original.grade}</Text>,
    size: 90,
  },
  {
    id: "setType",
    accessorKey: "setType",
    header: () => <RecordTable.InlineHead label={mn.questionType} icon={IconCategory} />,
    cell: ({ row }) => (
      <RecordTableInlineCell>
        <Badge variant={row.original.setType === "homework" ? "info" : "default"}>
          {mn.setTypeLabels[row.original.setType]}
        </Badge>
      </RecordTableInlineCell>
    ),
    size: 160,
  },
  {
    id: "difficulty",
    accessorKey: "difficulty",
    header: () => <RecordTable.InlineHead label={mn.difficulty} icon={IconChartBar} />,
    cell: ({ row }) => <Text>{mn.difficultyLabels[row.original.difficulty]}</Text>,
    size: 110,
  },
  {
    id: "questions",
    header: () => <RecordTable.InlineHead label={mn.questions} icon={IconHash} />,
    cell: ({ row }) => <Text>{row.original.questions.length}</Text>,
    size: 90,
  },
  {
    id: "author",
    header: () => <RecordTable.InlineHead label={mn.teacher} icon={IconUser} />,
    cell: ({ row }) => (
      <RecordTableInlineCell>
        <TextOverflowTooltip
          value={[row.original.author.fullName, row.original.author.school].filter(Boolean).join(" · ")}
        />
      </RecordTableInlineCell>
    ),
    size: 220,
  },
  {
    id: "visibility",
    accessorKey: "visibility",
    header: () => <RecordTable.InlineHead label={mn.public} icon={IconEye} />,
    cell: ({ row }) => (
      <RecordTableInlineCell>
        <Badge variant={row.original.visibility === "public" ? "success" : "warning"}>
          {row.original.visibility === "public" ? mn.public : mn.private}
        </Badge>
      </RecordTableInlineCell>
    ),
    size: 110,
  },
  {
    id: "copyCount",
    accessorKey: "copyCount",
    header: () => <RecordTable.InlineHead label={mn.copies} icon={IconCopy} />,
    cell: ({ row }) => <Text>{row.original.copyCount}</Text>,
    size: 100,
  },
  {
    id: "rating",
    header: () => <RecordTable.InlineHead label={mn.ratings} icon={IconStar} />,
    cell: ({ row }) => (
      <Text>
        {row.original.ratingCount
          ? `${row.original.ratingAverage.toFixed(1)} (${row.original.ratingCount})`
          : mn.noRating}
      </Text>
    ),
    size: 120,
  },
];

export const SetsTable = ({ scope }: { scope: Scope }) => {
  const navigate = useNavigate();
  const [queries] = useMultiQueryState<SetFilterQuery>([...SET_FILTER_KEYS]);
  const variables: HomeworkSetsQueryVariables = {
    scope,
    search: queries.search || null,
    subject: queries.subject || null,
    grade: queries.grade ? Number(queries.grade) : null,
    setType: (queries.setType as HomeworkSetsQueryVariables["setType"]) || null,
    difficulty: (queries.difficulty as HomeworkSetsQueryVariables["difficulty"]) || null,
    sort: (queries.sort as HomeworkSetsQueryVariables["sort"]) || "newest",
    limit: PAGE_SIZE,
    offset: 0,
  };
  const { data, loading, error, refetch, fetchMore } = useQuery(SETS_QUERY, {
    variables,
    notifyOnNetworkStatusChange: true,
  });

  const list = data?.homeworkSets.list ?? [];
  const totalCount = data?.homeworkSets.totalCount;
  const hasMore = list.length < (totalCount ?? 0) && list.length < 10_000;

  // Offset paging behind the record table's infinite scroll.
  const loadMore = () => {
    if (loading || !hasMore) return;
    void fetchMore({
      variables: { ...variables, offset: list.length },
      updateQuery: (previous, { fetchMoreResult }) => ({
        homeworkSets: {
          ...fetchMoreResult.homeworkSets,
          list: [...previous.homeworkSets.list, ...fetchMoreResult.homeworkSets.list],
        },
      }),
    });
  };

  const showEmpty = !loading && (!!error || list.length === 0);

  return (
    <div className="homework:flex homework:h-full homework:flex-col homework:overflow-hidden">
      <PageSubHeader>
        <SetsFilter totalCount={totalCount} />
      </PageSubHeader>
      <RecordTable.Provider
        columns={columns((id) => navigate(`/${path}/sets/${id}`))}
        data={list}
        stickyColumns={["title"]}
        tableId={`homework_sets_${scope}`}
        className="homework:relative homework:m-3 homework:h-full"
      >
        <RecordTable.Scroll>
          <RecordTable>
            <RecordTable.Header />
            <RecordTable.Body>
              <RecordTable.RowList />
              {loading && <RecordTable.RowSkeleton rows={list.length ? 3 : 20} />}
              {!loading && hasMore && <RecordTable.RowSkeleton rows={1} handleInView={loadMore} />}
            </RecordTable.Body>
          </RecordTable>
        </RecordTable.Scroll>
        {showEmpty && (
          <EmptyState
            overlay
            error={error}
            onRetry={() => refetch()}
            icon={IconBook}
            description={scope === "mine" ? mn.emptyCollection : mn.emptyLibrary}
          />
        )}
      </RecordTable.Provider>
    </div>
  );
};
