import { expect, test, type Page } from "@playwright/test";
import { mn } from "../../src/lib/i18n/mn";
import { mockExerciseSets } from "../../src/lib/ai/mock";
import { seedTopics, demoTeachers } from "../../src/lib/db/seed-data";
import type { ExerciseSet } from "../../src/lib/db/types";

const teacherId = "10000000-0000-4000-8000-000000000001";
const setId = "20000000-0000-4000-8000-000000000001";
const profile = { id: teacherId, ...demoTeachers[0], created_at: "2026-10-01T00:00:00Z" };
const fixtureSet: ExerciseSet = {
  id: setId,
  owner_id: teacherId,
  title: seedTopics[0].title,
  subject: "Математик",
  grade: 5,
  topic: seedTopics[0].title,
  curriculum_unit: null,
  set_type: "in_class",
  difficulty: "easy",
  questions: seedTopics[0].questions,
  source_type: "text",
  copied_from_id: null,
  visibility: "public",
  copy_count: 0,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
  author_name: profile.full_name,
  author_school: profile.school,
  rating_average: 0,
  rating_count: 0,
};
const expiry = Math.floor(Date.now() / 1000) + 3600;
const accessToken = `e30.${Buffer.from(JSON.stringify({ sub: teacherId, exp: expiry })).toString("base64url")}.test-only`;
const session = {
  access_token: accessToken,
  refresh_token: "test-only-refresh-placeholder",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: expiry,
  user: {
    id: teacherId,
    email: profile.email,
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: profile,
    created_at: "2026-10-01T00:00:00Z",
  },
};

async function signInFixture(page: Page) {
  await page.addInitScript(
    (value) => localStorage.setItem("sb-127-auth-token", JSON.stringify(value)),
    session,
  );
  await page.route("http://127.0.0.1:54399/**", (route) => route.fulfill({ json: session }));
}
async function fixtureApi(page: Page) {
  let savedBody: unknown = null;
  let current = structuredClone(fixtureSet);
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    expect(request.headers().authorization).toBe(`Bearer ${accessToken}`);
    if (path === "/api/me") return route.fulfill({ json: profile });
    if (path === "/api/generate") {
      const input = request.postDataJSON();
      return route.fulfill({ json: { ...mockExerciseSets(input), mocked: true } });
    }
    if (path === "/api/generations") {
      savedBody = request.postDataJSON();
      return route.fulfill({
        json: { in_class_set_id: setId, homework_set_id: "20000000-0000-4000-8000-000000000002" },
      });
    }
    if (path === "/api/sets") {
      const parameters = new URL(request.url()).searchParams;
      const sets = seedTopics.slice(0, 12).map((topic, index) => ({
        ...current,
        id: index === 0 ? setId : `${setId.slice(0, -2)}${String(index + 1).padStart(2, "0")}`,
        title: topic.title,
        topic: topic.title,
        subject: topic.subject,
        grade: topic.grade,
        questions: topic.questions,
        author_name: demoTeachers[Math.floor(index / 5)].full_name,
        author_school: demoTeachers[Math.floor(index / 5)].school,
      }));
      return route.fulfill({
        json: {
          sets: parameters.get("q") === "missing" ? [] : sets,
          total: parameters.get("q") === "missing" ? 0 : 12,
          page: 1,
          pageSize: 12,
        },
      });
    }
    if (path.endsWith("/copy")) {
      current.copy_count++;
      return route.fulfill({ json: { id: setId } });
    }
    if (path.endsWith("/rating")) {
      current.rating_count = 1;
      current.rating_average = request.postDataJSON().stars;
      return route.fulfill({ json: { success: true } });
    }
    if (path === `/api/sets/${setId}`) {
      if (request.method() === "PATCH") current = { ...current, ...request.postDataJSON() };
      return route.fulfill({ json: current });
    }
    return route.fulfill({ status: 404, json: { error: mn.notFound } });
  });
  return { saved: () => savedBody };
}

test("signed-out teachers are gated and all data APIs reject missing tokens", async ({
  page,
  request,
}) => {
  await page.goto("/generate");
  await expect(page.getByText(mn.unauthorized)).toBeVisible();
  for (const path of ["/api/me", "/api/sets", `/api/sets/${setId}`])
    expect((await request.get(path)).status()).toBe(401);
  for (const path of [
    "/api/generate",
    "/api/generations",
    "/api/uploads",
    `/api/sets/${setId}/copy`,
    `/api/sets/${setId}/rating`,
  ])
    expect((await request.post(path, { data: {} })).status()).toBe(401);
  expect((await request.patch(`/api/sets/${setId}`, { data: {} })).status()).toBe(401);
  expect((await request.delete(`/api/sets/${setId}`)).status()).toBe(401);
});
test("registration sends teacher details and handles email confirmation", async ({ page }) => {
  let registration: Record<string, unknown> = {};
  await page.route("http://127.0.0.1:54399/auth/v1/signup*", async (route) => {
    registration = route.request().postDataJSON();
    await route.fulfill({ json: { ...session.user, identities: [] } });
  });
  await page.goto("/register");
  await page.getByLabel(mn.fullName, { exact: true }).fill(profile.full_name);
  await page.getByLabel(mn.school, { exact: true }).fill(profile.school);
  await page.getByLabel(mn.district, { exact: true }).fill(profile.aimag_or_district);
  await page.getByLabel("Математик", { exact: true }).check();
  await page.getByLabel("5", { exact: true }).check();
  await page.getByLabel(mn.email, { exact: true }).fill(profile.email);
  await page.locator('input[name="password"]').fill("test-only-password");
  await page.getByRole("button", { name: mn.register, exact: true }).click();
  await expect(page.getByText(mn.confirmEmail)).toBeVisible();
  expect(registration.data).toMatchObject({
    full_name: profile.full_name,
    subjects: ["Математик"],
    grades: [5],
  });
});
test("teacher can generate, edit, reorder, remove, and save a pair", async ({ page }) => {
  await signInFixture(page);
  const api = await fixtureApi(page);
  await page.goto("/generate");
  await page.getByLabel(mn.topic, { exact: true }).fill("Ижил хуваарьтай бутархай");
  await page
    .getByLabel(mn.inputLabel, { exact: true })
    .fill("Ижил хуваарьтай бутархайн хүртвэрүүдийг нэмж, хуваарийг хэвээр үлдээнэ.");
  await page.getByRole("button", { name: mn.generateAction }).click();
  await expect(page.getByText(mn.mockNotice)).toBeVisible();
  await expect(page.locator(".editable-question")).toHaveCount(13);
  await page.getByLabel(mn.title, { exact: true }).fill("Багшийн зассан хувилбар");
  const classEditor = page.locator(".question-editor").first();
  await classEditor.getByRole("button", { name: `${mn.moveDown}: 1`, exact: true }).click();
  await classEditor.getByRole("button", { name: `${mn.deleteQuestion}: 5`, exact: true }).click();
  await classEditor
    .getByRole("textbox", { name: mn.question, exact: true })
    .first()
    .fill("Багшийн зассан асуулт");
  await page.getByRole("button", { name: mn.savePrivate, exact: true }).click();
  await expect(page.getByText(mn.saved, { exact: true })).toBeVisible();
  expect(api.saved()).toMatchObject({
    visibility: "private",
    generated: {
      title: "Багшийн зассан хувилбар",
      in_class: expect.arrayContaining([
        expect.objectContaining({ id: "class-2", prompt: "Багшийн зассан асуулт" }),
      ]),
    },
  });
  expect((api.saved() as { generated: { in_class: unknown[] } }).generated.in_class).toHaveLength(
    4,
  );
});
test("library renders on desktop and mobile, and empty search is recoverable", async ({
  page,
}, testInfo) => {
  await signInFixture(page);
  await fixtureApi(page);
  await page.goto("/library");
  await expect(page.locator(".set-card")).toHaveCount(12);
  await page.screenshot({ path: testInfo.outputPath("library-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: mn.libraryHeading })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: testInfo.outputPath("library-mobile.png"), fullPage: true });
  await page.getByRole("searchbox").fill("missing");
  await page.getByRole("button", { name: mn.search, exact: true }).click();
  await expect(page.getByText(mn.emptyTitle)).toBeVisible();
});
test("copy, rating, editing, and student/teacher print versions work", async ({ page }) => {
  await signInFixture(page);
  await fixtureApi(page);
  await page.goto(`/sets/${setId}`);
  await page.getByRole("button", { name: mn.copySet, exact: true }).click();
  await expect(page.getByText(mn.copied)).toBeVisible();
  await page.getByRole("button", { name: `${mn.rate}: 5 / 5`, exact: true }).click();
  await expect(page.getByText(mn.rated)).toBeVisible();
  await page.getByRole("button", { name: mn.edit, exact: true }).click();
  await page.getByLabel(mn.title, { exact: true }).fill("Зассан гарчиг");
  await page.getByRole("button", { name: mn.save, exact: true }).click();
  await expect(page.getByRole("heading", { name: "Зассан гарчиг" }).first()).toBeVisible();
  await page.goto(`/sets/${setId}/print`);
  await expect(page.locator(".worksheet")).toBeVisible();
  await expect(page.locator(".answer-key")).toHaveCount(0);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".sidebar")).toBeHidden();
  await page.goto(`/sets/${setId}/print?answers=1`);
  await expect(page.locator(".answer-key")).toBeVisible();
});
