import { mn } from "./mn";
import type { Question } from "./questions";

type Printable = {
  title: string;
  subject: string;
  grade: number;
  setType: keyof typeof mn.setTypeLabels;
  questions: Question[];
};

export function setToText(set: Printable, answers: boolean) {
  const header = `${set.title}\n${set.subject} · ${set.grade} ${mn.grade} · ${mn.setTypeLabels[set.setType]}\n`;
  const questions = set.questions
    .map(
      (question, index) =>
        `${index + 1}. ${question.prompt} (${question.points} ${mn.points})${
          question.options?.length
            ? "\n" + question.options.map((option, i) => `${String.fromCharCode(65 + i)}. ${option}`).join("\n")
            : ""
        }`,
    )
    .join("\n\n");
  const key = answers
    ? `\n\n${mn.answerKey}\n${set.questions
        .map((question, index) => `${index + 1}. ${question.answer}\n${question.explanation}`)
        .join("\n\n")}`
    : "";
  return `${header}\n${questions}${key}`;
}

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

// Prints from a detached iframe so only the worksheet reaches the printer,
// whatever the erxes host layout around the plugin looks like.
export function printWorksheet(
  set: Printable,
  { answers, school, className, date }: { answers: boolean; school: string; className: string; date: string },
) {
  const total = set.questions.reduce((sum, question) => sum + question.points, 0);
  const blank = "____________";
  const html = `<!doctype html><html lang="mn"><head><meta charset="utf-8"><title>${escape(set.title)}</title>
<style>
  body { font: 14px/1.5 system-ui, sans-serif; color: #111; margin: 24px; }
  header { border-bottom: 2px solid #111; margin-bottom: 16px; padding-bottom: 8px; }
  h1 { font-size: 20px; margin: 4px 0; }
  .meta, .fields { display: flex; flex-wrap: wrap; gap: 16px; color: #333; }
  ol.questions > li { margin: 0 0 18px; break-inside: avoid; }
  .prompt { display: flex; justify-content: space-between; gap: 12px; }
  .points { white-space: nowrap; color: #555; }
  .space { border-bottom: 1px dashed #999; height: 48px; }
  .key { break-before: page; }
</style></head><body>
<header>
  <div class="meta"><span>${escape(school)}</span></div>
  <h1>${escape(set.title)}</h1>
  <div class="meta"><span>${escape(set.subject)} · ${set.grade} ${mn.grade} · ${escape(mn.setTypeLabels[set.setType])}</span><span>${mn.totalPoints}: ${total}</span></div>
  <div class="fields"><span>${mn.className}: ${escape(className) || blank}</span><span>${mn.date}: ${escape(date) || blank}</span><span>${mn.student}: ________________________</span></div>
</header>
<ol class="questions">${set.questions
    .map(
      (question) => `<li><div class="prompt"><span>${escape(question.prompt)}</span><span class="points">${question.points} ${mn.points}</span></div>${
        question.options?.length
          ? `<ol type="A">${question.options.map((option) => `<li>${escape(option)}</li>`).join("")}</ol>`
          : ""
      }<div class="space"></div></li>`,
    )
    .join("")}</ol>
${
  answers
    ? `<section class="key"><h2>${mn.answerKey}</h2><ol>${set.questions
        .map((question) => `<li><strong>${escape(question.answer)}</strong><p>${escape(question.explanation)}</p></li>`)
        .join("")}</ol></section>`
    : ""
}
</body></html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0";
  document.body.appendChild(frame);
  const target = frame.contentWindow;
  if (!target) {
    frame.remove();
    return;
  }
  target.document.open();
  target.document.write(html);
  target.document.close();
  target.addEventListener("afterprint", () => frame.remove());
  setTimeout(() => {
    target.focus();
    target.print();
  }, 50);
}
