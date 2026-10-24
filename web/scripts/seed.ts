import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { demoTeachers, seedTopics } from "../src/lib/db/seed-data";
import type { Database } from "../src/lib/db/types";
import { questionsSchema } from "../src/lib/schema";
import { mn } from "../src/lib/i18n/mn";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_TEACHER_PASSWORD;
if (!url || !key || !password || password.length < 12) {
  console.error(mn.seedNotConfigured);
  process.exit(1);
}
const db = createClient<Database>(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const accounts = new Map<string, string>();
for (let page = 1; page <= 100; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw new Error("Cannot list demo accounts. Verify the service-role key.");
  for (const user of data.users) if (user.email) accounts.set(user.email, user.id);
  if (data.users.length < 1000) break;
}
for (let teacherIndex = 0; teacherIndex < demoTeachers.length; teacherIndex++) {
  const { email, ...profile } = demoTeachers[teacherIndex];
  let owner = accounts.get(email);
  if (!owner) {
    const { data, error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: profile,
    });
    if (error || !data.user)
      throw new Error(`Cannot create demo teacher ${email}. Apply the migration first.`);
    owner = data.user.id;
  }
  const { error: profileError } = await db
    .from("teachers")
    .upsert({ id: owner, ...profile }, { onConflict: "id", ignoreDuplicates: true });
  if (profileError) throw new Error("Cannot seed teacher profiles. Apply the migration first.");
  const topics = seedTopics.filter((topic) => profile.subjects.includes(topic.subject));
  for (let index = 0; index < topics.length; index++) {
    const topic = topics[index];
    questionsSchema.parse(topic.questions);
    const hash = createHash("sha256")
      .update(`homework-demo-v1:${teacherIndex}:${index}`)
      .digest("hex");
    const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
    const { error } = await db.from("exercise_sets").upsert(
      {
        id,
        owner_id: owner,
        title: topic.title,
        topic: topic.title,
        subject: topic.subject,
        grade: topic.grade,
        questions: topic.questions,
        difficulty: index < 2 ? "easy" : index < 4 ? "medium" : "hard",
        set_type: index % 2 ? "homework" : "in_class",
        source_type: "text",
        visibility: "public",
        created_at: new Date(Date.UTC(2026, 9, 1 + teacherIndex * 5 + index)).toISOString(),
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (error) throw new Error(`Cannot seed topic ${topic.title}.`);
  }
  console.log(`Demo teacher ready: ${email}`);
}
console.log(
  "20 public exercise sets ready. Existing demo sets were preserved. Password is the value you set in DEMO_TEACHER_PASSWORD.",
);
