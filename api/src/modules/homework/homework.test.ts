import "./test-env.ts";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { IUserDocument } from "erxes-api-shared/core-types";
import mongoose from "mongoose";
import { generateModels, type Context, type IModels } from "../../connectionResolvers.ts";
import { GENERATE, SETS_MANAGE, SETS_READ } from "../../permissions.ts";
import { generateValidated } from "./ai/generate.ts";
import { createCompletion } from "./ai/providers.ts";
import { aiCredentialsSchema } from "./ai/settings.ts";
import { mockExerciseSets } from "./ai/mock.ts";
import { isPdf, MAX_PDF_BYTES } from "./db/models/Uploads.ts";
import { homeworkResolvers } from "./graphql/resolvers.ts";
import {
  generatedSetsSchema,
  generationInputSchema,
  questionSchema,
  type GenerationInput,
} from "./validation.ts";

const input: GenerationInput = generationInputSchema.parse({
  subject: "Математик",
  grade: 5,
  topic: "Бутархай нэмэх",
  inputText: "Ижил хуваарьтай бутархайг нэмэх дүрэм.",
  inClassCount: 3,
  homeworkCount: 4,
  difficulty: "medium",
  sourceType: "text",
});

const { Query, Mutation } = homeworkResolvers;
let models: IModels;

const user = (_id: string) => ({ _id, email: `${_id}@school.mn`, details: { fullName: `Teacher ${_id}` } }) as IUserDocument;

// The same context startPlugin builds, with checkPermission reduced to an
// allow-list so tests can withhold individual actions.
const contextFor = (userId: string, allowed = [SETS_READ, SETS_MANAGE, GENERATE]) =>
  ({
    user: user(userId),
    subdomain: "localhost",
    models,
    checkPermission: async (action: string) => {
      if (!allowed.includes(action)) throw new Error("Permission required");
    },
  }) as unknown as Context;

const saveSets = async (userId: string, visibility: "private" | "public", requestId = crypto.randomUUID()) => {
  const generated = mockExerciseSets(input);
  return Mutation.homeworkGenerationSave(
    undefined,
    { requestId, input, generated, visibility },
    contextFor(userId),
  );
};

before(async () => {
  models = await generateModels("localhost");
  await mongoose.connection.asPromise();
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(models).map((model) => (model as mongoose.Model<unknown>).syncIndexes()));
});

after(async () => {
  await mongoose.connection.dropDatabase();
  // api-shared exits the process on any disconnect; a finished test run is expected.
  mongoose.connection.removeAllListeners("disconnected");
  await mongoose.disconnect();
});

describe("generation", () => {
  test("the sample produces the requested counts, valid answer keys and distinct ids", () => {
    const sets = mockExerciseSets(input);
    assert.equal(sets.inClass.length, 3);
    assert.equal(sets.homework.length, 4);
    assert.doesNotThrow(() => generatedSetsSchema.parse(sets));
  });

  test("provider completions use the teacher's saved key and selected model", async () => {
    const sample = mockExerciseSets(input);
    let requestUrl = "";
    let requestHeaders: Record<string, string> = {};
    let requestBody: unknown;
    const credentials = aiCredentialsSchema.parse({
      settings: { provider: "anthropic", model: "teacher-selected-model" },
      apiKey: "test-only-teacher-key",
    });
    const complete = createCompletion(credentials, undefined, async (url, headers, body) => {
      requestUrl = url;
      requestHeaders = headers;
      requestBody = body;
      return {
        stop_reason: "end_turn",
        content: [{ type: "text", text: JSON.stringify({
          title: sample.title,
          topic_summary: sample.topicSummary,
          in_class: sample.inClass,
          homework: sample.homework,
        }) }],
      };
    });
    const result = await generateValidated(input, complete);
    assert.equal(result.inClass.length, input.inClassCount);
    assert.equal(requestUrl, "https://api.anthropic.com/v1/messages");
    assert.equal(requestHeaders["x-api-key"], "test-only-teacher-key");
    assert.equal((requestBody as { model: string }).model, "teacher-selected-model");
  });

  test("invalid JSON is retried once and a valid second response is accepted", async () => {
    const sample = mockExerciseSets(input);
    const valid = JSON.stringify({
      title: sample.title,
      topic_summary: sample.topicSummary,
      in_class: sample.inClass,
      homework: sample.homework,
    });
    const replies = ["not json", valid];
    let calls = 0;
    const result = await generateValidated(input, async () => replies[calls++] ?? "");
    assert.equal(calls, 2);
    assert.equal(result.inClass.length, 3);
  });

  test("wrong counts are rejected after exactly one retry", async () => {
    const sample = mockExerciseSets({ inClassCount: 1, homeworkCount: 1 });
    const reply = JSON.stringify({
      title: sample.title,
      topic_summary: sample.topicSummary,
      in_class: sample.inClass,
      homework: sample.homework,
    });
    let calls = 0;
    await assert.rejects(generateValidated(input, async () => (calls++, reply)));
    assert.equal(calls, 2);
  });

  test("invalid answers, duplicate ids and unbounded inputs are rejected", () => {
    const question = { id: "q1", type: "multiple_choice", prompt: "?", options: ["a", "b"], answer: "c", explanation: "e", points: 1 };
    assert.throws(() => questionSchema.parse(question));
    assert.throws(() => generatedSetsSchema.parse({ ...mockExerciseSets(input), inClass: [mockExerciseSets(input).inClass[0], mockExerciseSets(input).inClass[0]] }));
    assert.throws(() => generationInputSchema.parse({ ...input, inputText: "x".repeat(20001) }));
    assert.throws(() => generationInputSchema.parse({ ...input, inClassCount: 21 }));
  });

  test("non-multiple-choice questions drop stale options", () => {
    const parsed = questionSchema.parse({ id: "q", type: "short_answer", prompt: "?", options: ["a", "b"], answer: "a", explanation: "e", points: 1 });
    assert.equal("options" in parsed, false);
  });

  test("PDF validation rejects renamed files and oversized documents", () => {
    assert.equal(isPdf(Buffer.from("%PDF-1.7 ...")), true);
    assert.equal(isPdf(Buffer.from("PK\u0003\u0004 zip")), false);
    assert.equal(isPdf(Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(MAX_PDF_BYTES)])), false);
  });
});

describe("saving and privacy", () => {
  test("saving the same request twice returns the same pair of sets", async () => {
    const requestId = crypto.randomUUID();
    const first = await saveSets("alice", "private", requestId);
    const second = await saveSets("alice", "private", requestId);
    assert.deepEqual(second, first);
    assert.equal(await models.ExerciseSets.countDocuments({ requestId }), 2);
  });

  test("private sets are invisible to other teachers, public ones are not", async () => {
    const privateSets = await saveSets("alice", "private");
    const publicSets = await saveSets("alice", "public");

    await assert.rejects(
      Query.homeworkSet(undefined, { _id: privateSets.inClassSetId }, contextFor("bob")),
      /not found/,
    );
    const visible = await Query.homeworkSet(undefined, { _id: publicSets.inClassSetId }, contextFor("bob"));
    assert.equal(visible.ownerId, "alice");

    const library = await Query.homeworkSets(undefined, { scope: "library" }, contextFor("bob"));
    assert.ok(library.list.every((set) => set.visibility === "public"));

    const mine = await Query.homeworkSets(undefined, { scope: "mine" }, contextFor("bob"));
    assert.equal(mine.totalCount, 0);
  });

  test("only the owner can edit or delete a set", async () => {
    const { homeworkSetId } = await saveSets("alice", "public");
    const set = await models.ExerciseSets.findById(homeworkSetId).lean();
    assert.ok(set);
    const update = {
      title: "Hijacked",
      subject: set.subject,
      grade: set.grade,
      topic: set.topic,
      difficulty: set.difficulty,
      visibility: "public",
      questions: set.questions,
    };

    await assert.rejects(Mutation.homeworkSetUpdate(undefined, { _id: homeworkSetId, input: update }, contextFor("bob")), /not found/);
    await assert.rejects(Mutation.homeworkSetRemove(undefined, { _id: homeworkSetId }, contextFor("bob")), /not found/);

    const updated = await Mutation.homeworkSetUpdate(undefined, { _id: homeworkSetId, input: { ...update, title: "Renamed" } }, contextFor("alice"));
    assert.equal(updated.title, "Renamed");
    assert.equal(await Mutation.homeworkSetRemove(undefined, { _id: homeworkSetId }, contextFor("alice")), true);
  });

  test("copying a public set makes a private copy and counts it", async () => {
    const { inClassSetId } = await saveSets("alice", "public");
    const copy = await Mutation.homeworkSetCopy(undefined, { _id: inClassSetId }, contextFor("bob"));

    assert.equal(copy.ownerId, "bob");
    assert.equal(copy.visibility, "private");
    assert.equal(copy.sourceType, "copied");
    assert.equal(copy.copiedFromId, inClassSetId);
    assert.equal((await models.ExerciseSets.findById(inClassSetId).lean())?.copyCount, 1);

    const privateSets = await saveSets("alice", "private");
    await assert.rejects(Mutation.homeworkSetCopy(undefined, { _id: privateSets.inClassSetId }, contextFor("bob")), /not found/);
  });

  test("ratings apply to public sets only, and re-rating replaces the earlier one", async () => {
    const { inClassSetId } = await saveSets("alice", "public");
    await Mutation.homeworkSetRate(undefined, { _id: inClassSetId, stars: 2 }, contextFor("bob"));
    await Mutation.homeworkSetRate(undefined, { _id: inClassSetId, stars: 4 }, contextFor("bob"));
    const rated = await Mutation.homeworkSetRate(undefined, { _id: inClassSetId, stars: 5 }, contextFor("carol"));
    assert.equal(rated.ratingCount, 2);
    assert.equal(rated.ratingAverage, 4.5);

    const privateSets = await saveSets("alice", "private");
    await assert.rejects(Mutation.homeworkSetRate(undefined, { _id: privateSets.inClassSetId, stars: 5 }, contextFor("alice")), /not found/);
    await assert.rejects(Mutation.homeworkSetRate(undefined, { _id: inClassSetId, stars: 6 }, contextFor("bob")), /stars|Too big|<=5/i);
  });

  test("uploaded PDFs are readable by their owner only", async () => {
    const id = await models.Uploads.createPdf("alice", "lesson.pdf", Buffer.from("%PDF-1.7 lesson"));
    assert.equal((await models.Uploads.readPdf("alice", id)).toString(), "%PDF-1.7 lesson");
    await assert.rejects(models.Uploads.readPdf("bob", id), /expired or was not found/);
    await assert.rejects(models.Uploads.createPdf("alice", "fake.pdf", Buffer.from("not a pdf")), /PDF/);
  });
});

describe("authorization", () => {
  test("every operation requires its erxes permission", async () => {
    const viewer = contextFor("dave", [SETS_READ]);
    await assert.rejects(Mutation.homeworkGenerate(undefined, { input }, viewer), /Permission required/);
    await assert.rejects(
      Mutation.homeworkGenerationSave(undefined, { requestId: crypto.randomUUID(), input, generated: mockExerciseSets(input), visibility: "private" }, viewer),
      /Permission required/,
    );
    await assert.rejects(Query.homeworkSets(undefined, { scope: "library" }, contextFor("erin", [])), /Permission required/);
    await assert.doesNotReject(Query.homeworkSets(undefined, { scope: "library" }, viewer));
  });

  test("anonymous requests are rejected before any data access", async () => {
    const anonymous = { ...contextFor("x"), user: undefined } as unknown as Context;
    await assert.rejects(Query.homeworkSets(undefined, { scope: "library" }, anonymous), /Login required/);
  });

  test("list pagination is bounded", async () => {
    await assert.rejects(Query.homeworkSets(undefined, { scope: "library", limit: 101 }, contextFor("bob")), /limit/);
    await assert.rejects(Query.homeworkSets(undefined, { scope: "library", offset: 10_001 }, contextFor("bob")), /offset/);
  });

  test("the teacher profile is created from the erxes user", async () => {
    const profile = await Query.homeworkProfile(undefined, undefined, contextFor("frank"));
    assert.equal(profile?.fullName, "Teacher frank");
  });
});
