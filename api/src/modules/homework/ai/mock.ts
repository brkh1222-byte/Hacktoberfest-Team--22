import type { GeneratedSets, GenerationInput, Question } from "../validation.ts";

export function mockExerciseSets(
  input: Pick<GenerationInput, "inClassCount" | "homeworkCount">,
): GeneratedSets {
  const makeQuestion = (index: number, homework: boolean): Question => {
    const denominator = 6 + index * 2;
    const left = index + 1;
    const right = 2;
    const answer = `${left + right}/${denominator}`;
    const common = {
      id: `${homework ? "home" : "class"}-${index + 1}`,
      answer,
      explanation: `Ижил хуваарьтай бутархайг нэмэхдээ хүртвэрүүдийг нэмнэ: ${left} + ${right} = ${left + right}. Хуваарь ${denominator} хэвээр үлдэнэ. Хариуг хураалгүй бичив.`,
      points: homework ? 2 : 1,
    };
    if (homework && index >= input.homeworkCount - 2)
      return {
        ...common,
        type: "calculation",
        prompt: `Саруул замын ${left}/${denominator} хэсгийг өглөө, ${right}/${denominator} хэсгийг өдөр алхжээ. Нийт замын ямар хэсгийг алхсан бэ? Хариуг хураалгүй бич.`,
      };
    if (index % 4 === 0)
      return {
        ...common,
        type: "multiple_choice",
        prompt: `${left}/${denominator} + ${right}/${denominator} нийлбэрийг ол. Хариуг хураалгүй бич.`,
        options: [
          answer,
          `${left + right}/${denominator * 2}`,
          `${left}/${denominator}`,
          `${left + right + 1}/${denominator}`,
        ],
      };
    if (index % 4 === 1)
      return {
        ...common,
        type: "fill_blank",
        prompt: `Хоосон зайд бутархайг нөх: ${left}/${denominator} + ${right}/${denominator} = ___. Хариуг хураалгүй бич.`,
      };
    if (index % 4 === 2)
      return {
        ...common,
        type: "true_false",
        prompt: `${left}/${denominator} + ${right}/${denominator} = ${left + right}/${denominator * 2} гэсэн хариу үнэн үү?`,
        answer: "Худал",
        explanation: `Хуваариудыг нэмэхгүй. Зөв хариу нь ${answer}.`,
      };
    return {
      ...common,
      type: "calculation",
      prompt: `${left}/${denominator} + ${right}/${denominator} нийлбэрийг бодож, хэрхэн бодсоноо тайлбарла. Хариуг хураалгүй бич.`,
    };
  };
  return {
    title: "Ижил хуваарьтай бутархайг нэмэх",
    topicSummary:
      "Ижил хуваарьтай бутархайн хүртвэрүүдийг нэмж, хуваарийг хэвээр үлдээх дүрэм. Туршилтын тогтмол жишээ; оруулсан агуулгыг боловсруулаагүй.",
    inClass: Array.from({ length: input.inClassCount }, (_, index) => makeQuestion(index, false)),
    homework: Array.from({ length: input.homeworkCount }, (_, index) => makeQuestion(index, true)),
  };
}
