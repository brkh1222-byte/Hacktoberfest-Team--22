import { useMutation, useQuery } from "@apollo/client";
import { IconSettings } from "@tabler/icons-react";
import { useState, type FormEvent } from "react";
import { Badge, Button, Card, Input, Select, useToast } from "erxes-ui";
import manifest from "../../../erxes.json" with { type: "json" };
import { Field, PageShell } from "~/components/PageShell";
import { ErrorState, Loading, errorText } from "~/components/States";
import type { HomeworkConfigQuery, HomeworkAiProvider, HomeworkProfileQuery } from "~/gql/graphql";
import {
  AI_SETTINGS_SAVE_MUTATION,
  CONFIG_QUERY,
  PROFILE_QUERY,
  PROFILE_UPDATE_MUTATION,
} from "~/graphql";
import { mn } from "~/lib/mn";

const { path } = manifest.ui;

type Profile = HomeworkProfileQuery["homeworkProfile"];

const toggle = <T,>(values: T[], value: T) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

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
      variables: {
        input: {
          fullName: fullName.trim(),
          school: school.trim(),
          district: district.trim(),
          subjects,
          grades,
        },
      },
    });
  };

  return (
    <form onSubmit={submit}>
      <fieldset disabled={loading} className="homework:flex homework:flex-col homework:gap-3">
        <div className="homework:grid homework:gap-3 homework:sm:grid-cols-3">
          <Field label={mn.fullName} htmlFor="homework-profile-name">
            <Input
              id="homework-profile-name"
              required
              minLength={1}
              maxLength={100}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </Field>
          <Field label={mn.school} htmlFor="homework-profile-school">
            <Input
              id="homework-profile-school"
              maxLength={150}
              value={school}
              onChange={(event) => setSchool(event.target.value)}
            />
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
        <div className="homework:flex homework:flex-col homework:gap-1.5">
          <span className="homework:text-sm homework:font-medium">{mn.subjectsLabel}</span>
          <div className="homework:flex homework:flex-wrap homework:gap-1.5">
            {mn.subjects.map((subject) => (
              <Button
                key={subject}
                size="sm"
                variant={subjects.includes(subject) ? "default" : "outline"}
                aria-pressed={subjects.includes(subject)}
                onClick={() => setSubjects(toggle(subjects, subject))}
              >
                {subject}
              </Button>
            ))}
          </div>
        </div>
        <div className="homework:flex homework:flex-col homework:gap-1.5">
          <span className="homework:text-sm homework:font-medium">{mn.gradesLabel}</span>
          <div className="homework:flex homework:flex-wrap homework:gap-1.5">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
              <Button
                key={grade}
                size="sm"
                variant={grades.includes(grade) ? "default" : "outline"}
                aria-pressed={grades.includes(grade)}
                onClick={() => setGrades(toggle(grades, grade).sort((a, b) => a - b))}
              >
                {grade}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Button type="submit">{loading ? mn.saving : mn.save}</Button>
        </div>
      </fieldset>
    </form>
  );
};

const PROVIDERS: { value: HomeworkAiProvider; label: string }[] = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Google Gemini" },
  { value: "openai_compatible", label: "OpenAI-compatible" },
];

const ApiKeyForm = ({ config }: { config: HomeworkConfigQuery["homeworkConfig"] }) => {
  const { toast } = useToast();
  const [provider, setProvider] = useState<HomeworkAiProvider>(config.provider ?? "anthropic");
  const [model, setModel] = useState(config.model ?? "");
  const [baseUrl, setBaseUrl] = useState(config.baseUrl ?? "");
  const [apiKey, setApiKey] = useState("");
  const [save, { loading, error }] = useMutation(AI_SETTINGS_SAVE_MUTATION, {
    refetchQueries: [CONFIG_QUERY],
    awaitRefetchQueries: true,
  });
  const submitKey = async (remove = false) => {
    try {
      await save({
        variables: {
          input: remove
            ? null
            : {
                settings: {
                  provider,
                  model: model.trim(),
                  baseUrl: provider === "openai_compatible" ? baseUrl.trim() : null,
                },
                apiKey: apiKey.trim(),
              },
        },
      });
      setApiKey("");
      toast({ title: remove ? mn.apiKeyRemoved : mn.apiKeySaved });
    } catch {
      // Apollo exposes the controlled error below, without echoing the input.
    }
  };
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submitKey();
      }}
      className="homework:flex homework:flex-col homework:gap-3"
    >
      <p>{mn.apiKeyIntro}</p>
      {!config.keyStorageEnabled && <p role="alert">{mn.apiKeyStorageUnavailable}</p>}
      <Field label={mn.aiProvider} htmlFor="homework-ai-provider">
        <Select
          value={provider}
          disabled={loading || !config.keyStorageEnabled}
          onValueChange={(value) => {
            setProvider(value as HomeworkAiProvider);
            setModel("");
            setBaseUrl("");
            setApiKey("");
          }}
        >
          <Select.Trigger id="homework-ai-provider">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {PROVIDERS.map((item) => (
              <Select.Item key={item.value} value={item.value}>
                {item.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </Field>
      <Field label={mn.aiModel} htmlFor="homework-ai-model">
        <Input
          id="homework-ai-model"
          value={model}
          onChange={(event) => setModel(event.target.value)}
          required
          maxLength={200}
          disabled={loading || !config.keyStorageEnabled}
        />
      </Field>
      <p className="homework:text-muted-foreground">{mn.aiModelHint}</p>
      {provider === "openai_compatible" && (
        <>
          <Field label={mn.aiBaseUrl} htmlFor="homework-ai-url">
            <Input
              id="homework-ai-url"
              type="url"
              value={baseUrl}
              onChange={(event) => {
                setBaseUrl(event.target.value);
                setApiKey("");
              }}
              required
              maxLength={500}
              disabled={loading || !config.keyStorageEnabled}
              placeholder="https://provider.example/v1"
            />
          </Field>
          <p className="homework:text-muted-foreground">{mn.aiCompatibleHint}</p>
        </>
      )}
      <Field label={mn.apiKeyLabel} htmlFor="homework-api-key">
        <Input
          id="homework-api-key"
          type="password"
          autoComplete="new-password"
          spellCheck={false}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          required
          maxLength={1024}
          disabled={loading || !config.keyStorageEnabled}
        />
      </Field>
      <p className="homework:text-muted-foreground">{mn.apiKeyPrivacy}</p>
      {error && (
        <p role="alert" className="homework:text-destructive">
          {errorText(error)}
        </p>
      )}
      <div className="homework:flex homework:flex-wrap homework:gap-2">
        <Button
          type="submit"
          disabled={loading || !config.keyStorageEnabled || !apiKey.trim() || !model.trim()}
        >
          {loading ? mn.saving : config.hasApiKey ? mn.apiKeyReplace : mn.apiKeySave}
        </Button>
        {config.hasApiKey && (
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => void submitKey(true)}
          >
            {mn.apiKeyRemove}
          </Button>
        )}
      </div>
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
    <PageShell
      title={mn.settings}
      icon={IconSettings}
      iconName="IconSettings"
      to={`/${path}/settings`}
      width="md"
    >
      <Card>
        <Card.Header>
          <Card.Title>{mn.profileHeading}</Card.Title>
          <Card.Description>{mn.profileIntro}</Card.Description>
        </Card.Header>
        <Card.Content>
          {profile.error ? (
            <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
          ) : !profile.data ? (
            <Loading />
          ) : (
            <ProfileForm
              key={profile.data.homeworkProfile.userId}
              profile={profile.data.homeworkProfile}
            />
          )}
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>{mn.aiHeading}</Card.Title>
        </Card.Header>
        <Card.Content className="homework:flex homework:flex-col homework:gap-2 homework:text-sm">
          {config.error ? (
            <ErrorState error={config.error} onRetry={() => config.refetch()} />
          ) : !ai ? (
            <Loading />
          ) : (
            <>
              <div className="homework:flex homework:items-center homework:gap-2">
                <Badge variant={ai.aiEnabled ? "success" : "warning"}>
                  {ai.hasApiKey ? mn.apiKeyStored : mn.apiKeyMissing}
                </Badge>
                {ai.model && (
                  <span className="homework:text-muted-foreground">
                    {mn.aiModel}: <code className="homework:font-mono">{ai.model}</code>
                  </span>
                )}
              </div>
              <ApiKeyForm
                key={`${ai.provider}-${ai.model}-${ai.baseUrl}-${ai.hasApiKey}`}
                config={ai}
              />
            </>
          )}
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>Plugin</Card.Title>
          <Card.Description>{manifest.description}</Card.Description>
        </Card.Header>
        <Card.Content>
          <dl className="homework:grid homework:grid-cols-[8rem_1fr] homework:gap-y-2 homework:text-sm">
            {IDENTITY.map(([label, value]) => (
              <div key={label} className="homework:contents">
                <dt className="homework:text-muted-foreground">{label}</dt>
                <dd>
                  <code className="homework:rounded homework:bg-muted homework:px-1.5 homework:py-0.5 homework:font-mono homework:text-xs">
                    {value}
                  </code>
                </dd>
              </div>
            ))}
          </dl>
        </Card.Content>
      </Card>
    </PageShell>
  );
};
