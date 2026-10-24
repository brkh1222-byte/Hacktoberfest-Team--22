import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { demoTeachers, seedTopics } from "../src/lib/db/seed-data";
import { connectMongo } from "../src/lib/db/connection";
import { GenerationModel, TeacherModel } from "../src/lib/db/models";
import { hashPassword } from "../src/lib/db/session";
import { questionsSchema } from "../src/lib/schema";
import { mn } from "../src/lib/i18n/mn";

const password = process.env.DEMO_TEACHER_PASSWORD;
if (!password || password.length < 12 || !process.env.AUTH_SECRET || Buffer.byteLength(process.env.AUTH_SECRET) < 32) {
  console.error(mn.seedNotConfigured);
  process.exit(1);
}
await connectMongo();
for (let teacherIndex = 0; teacherIndex < demoTeachers.length; teacherIndex++) {
  const { email, ...profile } = demoTeachers[teacherIndex];
  const teacher = await TeacherModel.findOneAndUpdate({ email }, { $setOnInsert: { ...profile, email, password_hash: await hashPassword(password) } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  const topics = seedTopics.filter((topic) => profile.subjects.includes(topic.subject));
  for (let index = 0; index < topics.length; index++) {
    const topic = topics[index];
    questionsSchema.parse(topic.questions);
    const digest = createHash("sha256").update(`homework-demo-v2:${teacherIndex}:${index}`).digest("hex");
    const generationId = new mongoose.Types.ObjectId(digest.slice(0, 24));
    const setId = new mongoose.Types.ObjectId(digest.slice(24, 48));
    const created = new Date(Date.UTC(2026, 9, 1 + teacherIndex * 5 + index));
    const doc = await GenerationModel.findOne({ _id: generationId });
    if (!doc) await GenerationModel.create({ _id: generationId, owner_id: String(teacher._id), subject: topic.subject, grade: topic.grade, topic: topic.title, input_text: "Demo lesson material", pdf_path: null, sets: [{ _id: setId, title: topic.title, subject: topic.subject, grade: topic.grade, topic: topic.title, curriculum_unit: null, set_type: index % 2 ? "homework" : "in_class", difficulty: index < 2 ? "easy" : index < 4 ? "medium" : "hard", questions: topic.questions, source_type: "text", copied_from_id: null, visibility: "public", created_at: created, updated_at: created }] });
  }
  console.log(`Demo teacher ready: ${email}`);
}
console.log("20 public exercise sets ready. Existing demo sets were preserved.");
await mongoose.disconnect();
