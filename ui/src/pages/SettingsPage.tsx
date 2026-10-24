import { useMutation, useQuery } from "@apollo/client";
import { IconSettings } from "@tabler/icons-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Badge, Breadcrumb, Button, Input, Separator, Toggle, useToast } from "erxes-ui";
import { PageHeader } from "ui-modules";
import { Link } from "react-router";
import manifest from "../../../erxes.json" with { type: "json" };
import { Field } from "~/components/Field";
import { EmptyState, Loading, errorText } from "~/components/States";
import type { HomeworkProfileQuery } from "~/gql/graphql";
import { CONFIG_QUERY, PROFILE_QUERY, PROFILE_UPDATE_MUTATION } from "~/graphql";
import { mn } from "~/lib/mn";

const { path } = manifest.ui;

type Profile = HomeworkProfileQuery["homeworkProfile"];

const toggle = <T,>(values: T[], value: T) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

const Section = ({ title, description, children }: { title: string; description?: string; children: ReactNode }) => (
  <section className="homework:flex homework:flex-col homework:gap-4">
    <div>
      <h2 className="homework:text-lg homework:font-semibold">{title}</h2>
      {description && <p className="homework:text-sm homework:text-muted-foreground">{description}</p>}
    </div>
    {children}
  </section>
);

const ProfileForm = ({ profile }: { profile: Profile }) => {
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile.fullName);
  const [school, setSchool] = useState(profile.school);
  const [district, setDistrict] = useState(profile.district);
  const [subjects, setSubjects] = useState(profile.subjects);
  const [grades, setGrades] = useState(profile.grades);
  const [save, { loading }] = useMutation(PROFILE_UPDATE_MUTATION, {
    refetchQueries: [PROFILE_QUERY],
    onCompleted: () => toast({ title: mn.profileSaved }),
    onError: (error) => toast({ variant: "destructive", title: errorText(error) }),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void save({
      variables: { input: { fullName: fullName.trim(), school: school.trim(), district: district.trim(), subjects, grades } },
    });
  };

  return (
    <form onSubmit={submit}>
      <fieldset disabled={loading} className="homework:flex homework:flex-col homework:gap-4">
        <div className="homework:grid homework:gap-4 homework:sm:grid-cols-3">
          <Field label={mn.fullName} htmlFor="homework-profile-name">
            <Input
              id="homework-profile-name"
              required
              maxLength={100}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </Field>
          <Field label={mn.school} htmlFor="homework-profile-school">
            <Input id="homework-profile-school" maxLength={150} value={school} onChange={(event) => setSchool(event.target.value)} />
          </Field>
          <Field label={mn.district} htmlFor="homework-profile-district">
            <Input
              id="homework-profile-district"
              maxLength={100}
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
            />
          </Field>
        </div>
        <Field label={mn.subjectsLabel}>
          <div className="homework:flex homework:flex-wrap homework:gap-1.5">
            {mn.subjects.map((subject) => (
              <Toggle
                key={subject}
                size="sm"
                variant="outline"
                pressed={subjects.includes(subject)}
                onPressedChange={() => setSubjects(toggle(subjects, subject))}
              >
                {subject}
              </Toggle>
            ))}
          </div>
        </Field>
        <Field label={mn.gradesLabel}>
          <div className="homework:flex homework:flex-wrap homework:gap-1.5">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
              <Toggle
                key={grade}
                size="sm"
                variant="outline"
                pressed={grades.includes(grade)}
                onPressedChange={() => setGrades(toggle(grades, grade).sort((a, b) => a - b))}
              >
                {grade}
              </Toggle>
            ))}
          </div>
        </Field>
        <div>
          <Button type="submit">{loading ? mn.saving : mn.save}</Button>
        </div>
      </fieldset>
    </form>
  );
};

const IDENTITY: [string, string][] = [
  ["Name", manifest.name],
  ["Route", `/${path}`],
  ["Remote", manifest.ui.remote],
  ["API", `:${manifest.api.port}${manifest.api.graphql}`],
  ["Version", manifest.version],
];

export const SettingsPage = () => {
  const profile = useQuery(PROFILE_QUERY);
  const config = useQuery(CONFIG_QUERY);
  const ai = config.data?.homeworkConfig;

  return (
    <>
      <PageHeader>
        <PageHeader.Start>
          <Breadcrumb>
            <Breadcrumb.List className="homework:gap-1">
              <Breadcrumb.Item>
                <Button variant="ghost" asChild>
                  <Link to={`/${path}/settings`}>
                    <IconSettings />
                    {mn.settings}
                  </Link>
                </Button>
              </Breadcrumb.Item>
            </Breadcrumb.List>
          </Breadcrumb>
        </PageHeader.Start>
      </PageHeader>
      <div className="homework:h-full homework:overflow-auto">
        <div className="homework:mx-auto homework:mt-12 homework:flex homework:w-full homework:max-w-3xl homework:flex-col homework:gap-8 homework:px-6 homework:pb-12">
          <Section title={mn.profileHeading} description={mn.profileIntro}>
            {profile.error ? (
              <EmptyState error={profile.error} onRetry={() => profile.refetch()} />
            ) : !profile.data ? (
              <Loading />
            ) : (
              <ProfileForm key={profile.data.homeworkProfile.userId} profile={profile.data.homeworkProfile} />
            )}
          </Section>
          <Separator />
          <Section title={mn.aiHeading}>
            {config.error ? (
              <EmptyState error={config.error} onRetry={() => config.refetch()} />
            ) : !ai ? (
              <Loading />
            ) : (
              <div className="homework:flex homework:flex-col homework:gap-2 homework:rounded-lg homework:bg-sidebar homework:p-4 homework:text-sm">
                <div className="homework:flex homework:items-center homework:gap-2">
                  <Badge variant={ai.aiEnabled ? "success" : "warning"}>{ai.aiEnabled ? mn.aiLive : mn.aiMockStatus}</Badge>
                  {ai.model && (
                    <span className="homework:text-muted-foreground">
                      {mn.aiModel}: <code className="homework:font-mono">{ai.model}</code>
                    </span>
                  )}
                </div>
                {!ai.aiEnabled && <p className="homework:text-muted-foreground">{mn.aiMockHint}</p>}
              </div>
            )}
          </Section>
          <Separator />
          <Section title="Plugin" description={manifest.description}>
            <dl className="homework:grid homework:grid-cols-[8rem_1fr] homework:gap-y-2 homework:rounded-lg homework:bg-sidebar homework:p-4 homework:text-sm">
              {IDENTITY.map(([label, value]) => (
                <div key={label} className="homework:contents">
                  <dt className="homework:text-muted-foreground">{label}</dt>
                  <dd>
                    <code className="homework:font-mono homework:text-xs">{value}</code>
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        </div>
      </div>
    </>
  );
};
