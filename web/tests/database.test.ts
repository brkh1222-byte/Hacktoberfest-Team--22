import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { mockExerciseSets } from "../src/lib/ai/mock";

const db = new PGlite();
const alice = "10000000-0000-4000-8000-000000000001";
const bob = "10000000-0000-4000-8000-000000000002";
const publicId = "20000000-0000-4000-8000-000000000001";
const privateId = "20000000-0000-4000-8000-000000000002";
const generated = mockExerciseSets({ inClassCount: 5, homeworkCount: 8 });

// Minimal Supabase platform schemas; the application's actual migration is
// executed unchanged against PostgreSQL, including its RLS and functions.
before(async () => {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema storage;
    grant usage on schema public, auth, storage to anon, authenticated;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text);
    alter table storage.objects enable row level security;
    grant select, insert, delete on storage.objects to authenticated;
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(regexp_replace(name, '/[^/]*$', ''), '/') $$;
  `);
  await db.exec(
    await readFile(
      new URL("../../supabase/migrations/202610240001_homework_library.sql", import.meta.url),
      "utf8",
    ),
  );
  for (const [id, name] of [
    [alice, "Алимаа"],
    [bob, "Болд"],
  ]) {
    await db.query("insert into auth.users(id, raw_user_meta_data) values ($1, $2)", [
      id,
      JSON.stringify({
        full_name: name,
        school: "Демо сургууль",
        aimag_or_district: "Улаанбаатар",
        subjects: ["Математик"],
        grades: [5],
      }),
    ]);
  }
  for (const [id, visibility] of [
    [publicId, "public"],
    [privateId, "private"],
  ]) {
    await db.query(
      "insert into public.exercise_sets(id, owner_id, title, subject, grade, topic, set_type, difficulty, questions, source_type, visibility) values ($1,$2,'Бутархай','Математик',5,'Нэмэх','in_class','easy',$3,'text',$4)",
      [id, alice, JSON.stringify(generated.in_class), visibility],
    );
  }
});
after(async () => {
  await db.close();
});

async function asUser<T>(id: string | null, operation: () => Promise<T>) {
  await db.exec("begin");
  try {
    await db.exec(id ? "set local role authenticated" : "set local role anon");
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [id ?? ""]);
    const value = await operation();
    await db.exec("commit");
    return value;
  } catch (error) {
    await db.exec("rollback");
    throw error;
  }
}

test("profile trigger creates real teacher rows and unauthenticated access is denied", async () => {
  const profiles = await db.query("select id from public.teachers");
  assert.equal(profiles.rows.length, 2);
  await assert.rejects(
    asUser(null, () => db.query("select * from public.exercise_set_details")),
    /permission denied/,
  );
  await assert.rejects(
    asUser(null, () => db.query("select public.copy_exercise_set($1)", [publicId])),
    /permission denied/,
  );
});
test("RLS hides private sets and enforces ownership even through the detail view", async () => {
  const own = await asUser(alice, () => db.query("select id from public.exercise_set_details"));
  assert.equal(own.rows.length, 2);
  const other = await asUser(bob, () =>
    db.query<{ id: string }>("select id from public.exercise_set_details"),
  );
  assert.deepEqual(
    other.rows.map((row) => row.id),
    [publicId],
  );
  const changed = await asUser(bob, () =>
    db.query("update public.exercise_sets set title = 'Stolen' where id = $1 returning id", [
      publicId,
    ]),
  );
  assert.equal(changed.rows.length, 0);
  const deleted = await asUser(bob, () =>
    db.query("delete from public.exercise_sets where id = $1 returning id", [publicId]),
  );
  assert.equal(deleted.rows.length, 0);
  await assert.rejects(
    asUser(alice, () =>
      db.query("update public.exercise_sets set copy_count = 999 where id = $1", [publicId]),
    ),
    /permission denied/,
  );
  await assert.rejects(
    asUser(alice, () =>
      db.query("update public.exercise_sets set owner_id = $1 where id = $2", [bob, publicId]),
    ),
    /permission denied/,
  );
});
test("copying creates a private independent row and increments the source atomically", async () => {
  await assert.rejects(
    asUser(bob, () => db.query("select public.copy_exercise_set($1)", [privateId])),
    /Set not found/,
  );
  const copied = await asUser(bob, () =>
    db.query<{ id: string }>("select public.copy_exercise_set($1) as id", [publicId]),
  );
  const copiedId = copied.rows[0].id;
  const rows = await asUser(bob, () =>
    db.query<{ owner_id: string; visibility: string; copied_from_id: string }>(
      "select owner_id, visibility, copied_from_id from public.exercise_sets where id = $1",
      [copiedId],
    ),
  );
  assert.deepEqual(rows.rows[0], {
    owner_id: bob,
    visibility: "private",
    copied_from_id: publicId,
  });
  await asUser(bob, () =>
    db.query("update public.exercise_sets set title = 'Миний хувилбар' where id = $1", [copiedId]),
  );
  const original = await asUser(alice, () =>
    db.query<{ title: string; copy_count: number }>(
      "select title, copy_count from public.exercise_sets where id = $1",
      [publicId],
    ),
  );
  assert.equal(original.rows[0].title, "Бутархай");
  assert.equal(original.rows[0].copy_count, 1);
});
test("pair saving is atomic and rejects invalid question data", async () => {
  const malformedOptions = await db.query<{ valid: boolean }>(
    "select public.valid_homework_questions($1) as valid",
    [JSON.stringify([{ ...generated.homework[0], type: "short_answer", options: "invalid" }])],
  );
  assert.equal(malformedOptions.rows[0].valid, false);
  const input = {
    subject: "Математик",
    grade: 5,
    topic: "Нэмэх",
    inputText: "Ижил хуваарьтай бутархайг нэмэх",
    sourceType: "text",
    difficulty: "medium",
  };
  const beforeCount = await db.query<{ count: number }>(
    "select count(*)::int as count from public.exercise_sets",
  );
  const invalid = {
    input,
    generated: { ...generated, homework: [{ ...generated.homework[0], answer: null }] },
    visibility: "private",
  };
  await assert.rejects(
    asUser(bob, () =>
      db.query("select * from public.save_lesson_generation($1)", [JSON.stringify(invalid)]),
    ),
    /check constraint/,
  );
  const afterCount = await db.query<{ count: number }>(
    "select count(*)::int as count from public.exercise_sets",
  );
  assert.equal(beforeCount.rows[0].count, afterCount.rows[0].count);
  const saved = await asUser(bob, () =>
    db.query<{ in_class_set_id: string; homework_set_id: string }>(
      "select * from public.save_lesson_generation($1)",
      [JSON.stringify({ input, generated, visibility: "private" })],
    ),
  );
  assert.ok(saved.rows[0].in_class_set_id);
  assert.ok(saved.rows[0].homework_set_id);
  const generations = await asUser(bob, () => db.query("select * from public.lesson_generations"));
  assert.equal(generations.rows.length, 1);
  const hidden = await asUser(alice, () => db.query("select * from public.lesson_generations"));
  assert.equal(hidden.rows.length, 0);
});
test("ratings have one row per teacher and cannot be changed by another teacher", async () => {
  await asUser(bob, () =>
    db.query("insert into public.ratings(set_id, teacher_id, stars) values ($1, $2, 4)", [
      publicId,
      bob,
    ]),
  );
  await assert.rejects(
    asUser(bob, () =>
      db.query("insert into public.ratings(set_id, teacher_id, stars) values ($1, $2, 5)", [
        publicId,
        bob,
      ]),
    ),
    /duplicate key/,
  );
  const changed = await asUser(alice, () =>
    db.query("update public.ratings set stars = 1 where set_id = $1 returning stars", [publicId]),
  );
  assert.equal(changed.rows.length, 0);
  await asUser(bob, () =>
    db.query("update public.ratings set stars = 5 where set_id = $1 and teacher_id = $2", [
      publicId,
      bob,
    ]),
  );
  const detail = await asUser(alice, () =>
    db.query<{ rating_average: number; rating_count: number }>(
      "select rating_average, rating_count from public.exercise_set_details where id = $1",
      [publicId],
    ),
  );
  assert.equal(detail.rows[0].rating_average, 5);
  assert.equal(detail.rows[0].rating_count, 1);
  await assert.rejects(
    asUser(alice, () =>
      db.query("insert into public.ratings(set_id, teacher_id, stars) values ($1,$2,3)", [
        privateId,
        alice,
      ]),
    ),
    /row-level security/,
  );
});
test("PDF storage policies isolate each teacher's files", async () => {
  await asUser(alice, () =>
    db.query("insert into storage.objects(bucket_id, name) values ('lesson-pdfs', $1)", [
      `${alice}/lesson.pdf`,
    ]),
  );
  const hidden = await asUser(bob, () => db.query("select * from storage.objects"));
  assert.equal(hidden.rows.length, 0);
  await assert.rejects(
    asUser(bob, () =>
      db.query("insert into storage.objects(bucket_id, name) values ('lesson-pdfs', $1)", [
        `${alice}/forged.pdf`,
      ]),
    ),
    /row-level security/,
  );
  const removed = await asUser(bob, () => db.query("delete from storage.objects returning id"));
  assert.equal(removed.rows.length, 0);
});
