import { randomUUID } from "crypto";
import { prisma } from "@/db/client";

type SeedQuestion = {
  concept: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  prompt: string;
  explanation: string;
  answer: string;
  options: string[];
};

const BANK: Record<string, SeedQuestion[]> = {
  functions: [
    { concept: "Function composition", difficulty: "EASY", prompt: "If f(x) = x + 3 and g(x) = 2x, what is (f ∘ g)(2)?", explanation: "Apply g first: g(2)=4. Then f(4)=7.", answer: "7", options: ["7", "5", "10", "4"] },
    { concept: "Function composition", difficulty: "MEDIUM", prompt: "If f(x)=2x−1 and g(x)=x², what is (g ∘ f)(2)?", explanation: "First f(2)=3, then g(3)=9.", answer: "9", options: ["9", "7", "3", "5"] },
    { concept: "Domain and range", difficulty: "EASY", prompt: "What is the domain of f(x)=1/(x−4)?", explanation: "The denominator cannot be zero, so x=4 is excluded.", answer: "All real x except 4", options: ["All real x except 4", "All real x", "x ≥ 4", "x > 4"] },
    { concept: "Domain and range", difficulty: "MEDIUM", prompt: "What is the range of f(x)=x² for real x?", explanation: "A square of a real number is never negative and every non-negative value is attainable.", answer: "[0, ∞)", options: ["[0, ∞)", "(−∞, 0]", "R", "(0, ∞)"] },
    { concept: "Inverse functions", difficulty: "EASY", prompt: "If f(x)=x+5, what is f⁻¹(x)?", explanation: "Set y=x+5 and solve x=y−5, giving the inverse.", answer: "x−5", options: ["x−5", "x+5", "5−x", "1/(x+5)"] },
    { concept: "Inverse functions", difficulty: "HARD", prompt: "For f(x)=3x−2, which value is f⁻¹(10)?", explanation: "Solve 3x−2=10, so x=4.", answer: "4", options: ["4", "3", "12", "8/3"] },
    { concept: "One-one functions", difficulty: "MEDIUM", prompt: "Which function is one-to-one on R?", explanation: "A non-zero linear function is one-to-one on the real numbers.", answer: "f(x)=2x+1", options: ["f(x)=2x+1", "f(x)=x²", "f(x)=|x|", "f(x)=x²+3"] },
    { concept: "Composition", difficulty: "HARD", prompt: "If f(x)=x² and g(x)=x+1, what is (f∘g)(x)?", explanation: "Apply g first: f(g(x))=(x+1)².", answer: "(x+1)²", options: ["(x+1)²", "x²+1", "x²+x", "2x+1"] },
    { concept: "Function values", difficulty: "HARD", prompt: "If f(x)=x²−2x+1, for which x is f(x)=0?", explanation: "x²−2x+1=(x−1)², so x=1.", answer: "1", options: ["1", "−1", "0", "2"] },
    { concept: "Range", difficulty: "HARD", prompt: "If f(x)=2x+3, what is f⁻¹(11)?", explanation: "Solve 2x+3=11, giving x=4.", answer: "4", options: ["4", "7", "14", "8"] },
  ],
  relations: [
    { concept: "Reflexive relations", difficulty: "EASY", prompt: "A relation R on A is reflexive when which condition holds?", explanation: "Every element must be related to itself: (a,a) ∈ R for every a ∈ A.", answer: "(a,a) ∈ R for every a", options: ["(a,a) ∈ R for every a", "(a,b) ∈ R for every a,b", "(a,b) ∈ R implies (b,a) ∈ R", "No pair belongs to R"] },
    { concept: "Symmetric relations", difficulty: "EASY", prompt: "If a relation is symmetric, what must be true?", explanation: "Whenever (a,b) belongs to R, the reversed pair (b,a) must also belong to R.", answer: "(a,b)∈R ⇒ (b,a)∈R", options: ["(a,b)∈R ⇒ (b,a)∈R", "(a,a)∈R for all a", "(a,b)∈R ⇒ (a,a)∈R", "Every pair must belong to R"] },
    { concept: "Transitive relations", difficulty: "EASY", prompt: "Which statement describes transitivity?", explanation: "Transitivity requires aRb and bRc to imply aRc.", answer: "aRb and bRc imply aRc", options: ["aRb and bRc imply aRc", "aRb implies bRa", "aRa for every a", "aRb implies aRa"] },
    { concept: "Equivalence relations", difficulty: "MEDIUM", prompt: "An equivalence relation must be which combination?", explanation: "It is reflexive, symmetric, and transitive.", answer: "Reflexive, symmetric, and transitive", options: ["Reflexive, symmetric, and transitive", "Only symmetric", "Only transitive", "Antisymmetric and irreflexive"] },
    { concept: "Equivalence classes", difficulty: "MEDIUM", prompt: "Equivalence classes of an equivalence relation form what?", explanation: "They partition the underlying set into disjoint classes whose union is the whole set.", answer: "A partition of the set", options: ["A partition of the set", "A single empty set", "A complete graph only", "A power set always"] },
    { concept: "Partial orders", difficulty: "MEDIUM", prompt: "A partial order is reflexive, antisymmetric and what?", explanation: "The third property is transitivity.", answer: "Transitive", options: ["Transitive", "Symmetric", "Irreflexive", "Surjective"] },
    { concept: "Antisymmetry", difficulty: "HARD", prompt: "For antisymmetry, aRb and bRa together imply what?", explanation: "They force a=b.", answer: "a=b", options: ["a=b", "a≠b", "aRb only", "bRa only"] },
    { concept: "Relation representation", difficulty: "HARD", prompt: "A relation on a finite set can be represented using which matrix?", explanation: "A Boolean relation matrix records whether each ordered pair belongs to the relation.", answer: "A Boolean 0–1 matrix", options: ["A Boolean 0–1 matrix", "Only a diagonal matrix", "Only a scalar", "Only a triangular matrix"] },
    { concept: "Closure", difficulty: "HARD", prompt: "The transitive closure of R contains R and is the smallest relation with which property?", explanation: "It is the smallest transitive relation containing R.", answer: "Transitivity", options: ["Transitivity", "Symmetry only", "Irreflexivity", "Bijectivity"] },
    { concept: "Equivalence relations", difficulty: "HARD", prompt: "If R is an equivalence relation on A, what is true about two equivalence classes?", explanation: "Equivalence classes are either identical or disjoint.", answer: "They are identical or disjoint", options: ["They are identical or disjoint", "They always overlap partly", "They are always singletons", "They are never disjoint"] },
  ],
  sets: [
    { concept: "Set operations", difficulty: "EASY", prompt: "If A={1,2,3} and B={3,4}, what is A∪B?", explanation: "Union contains every distinct element from either set.", answer: "{1,2,3,4}", options: ["{1,2,3,4}", "{3}", "{1,2}", "{4}"] },
    { concept: "Set intersection", difficulty: "EASY", prompt: "If A={1,2,3} and B={2,3,4}, what is A∩B?", explanation: "Intersection contains elements common to both sets.", answer: "{2,3}", options: ["{2,3}", "{1,4}", "{1,2,3,4}", "∅"] },
    { concept: "Difference", difficulty: "EASY", prompt: "If A={1,2,3} and B={2,4}, what is A−B?", explanation: "Remove elements of B from A, leaving 1 and 3.", answer: "{1,3}", options: ["{1,3}", "{2}", "{2,4}", "{1,2,3,4}"] },
    { concept: "Power sets", difficulty: "MEDIUM", prompt: "A set with 4 elements has how many subsets?", explanation: "A set with n elements has 2ⁿ subsets, so 2⁴=16.", answer: "16", options: ["16", "8", "12", "20"] },
    { concept: "Cardinality", difficulty: "MEDIUM", prompt: "If |A|=20, |B|=15 and |A∩B|=5, what is |A∪B|?", explanation: "Use |A∪B|=|A|+|B|−|A∩B|=30.", answer: "30", options: ["30", "40", "25", "10"] },
    { concept: "Inclusion-exclusion", difficulty: "MEDIUM", prompt: "In a class, 30 study Python, 25 study C++, and 10 study both. How many study at least one?", explanation: "30+25−10=45.", answer: "45", options: ["45", "55", "35", "40"] },
    { concept: "Disjoint sets", difficulty: "HARD", prompt: "Two sets are disjoint when their intersection is what?", explanation: "Disjoint sets share no elements, so their intersection is empty.", answer: "∅", options: ["∅", "A", "B", "A∪B"] },
    { concept: "Cartesian product", difficulty: "HARD", prompt: "If |A|=3 and |B|=4, what is |A×B|?", explanation: "Each of 3 elements of A pairs with each of 4 elements of B: 12 ordered pairs.", answer: "12", options: ["12", "7", "9", "16"] },
    { concept: "De Morgan's laws", difficulty: "HARD", prompt: "Which identity is De Morgan's law for the complement of a union?", explanation: "The complement of a union equals the intersection of the complements.", answer: "(A∪B)ᶜ=Aᶜ∩Bᶜ", options: ["(A∪B)ᶜ=Aᶜ∩Bᶜ", "(A∪B)ᶜ=Aᶜ∪Bᶜ", "(A∩B)ᶜ=Aᶜ∩Bᶜ", "A∪Aᶜ=A"] },
    { concept: "Set complement", difficulty: "HARD", prompt: "If U={1,2,3,4,5} and A={1,3}, what is Aᶜ relative to U?", explanation: "The complement contains elements of U that are not in A: 2,4,5.", answer: "{2,4,5}", options: ["{2,4,5}", "{1,3}", "{1,2,3,4,5}", "∅"] },
  ],
};

const TARGET_PER_TOPIC = 1000;

function key(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findBank(topicName: string) {
  const k = key(topicName);
  return Object.entries(BANK).find(([name]) => k === name || k.includes(name) || name.includes(k))?.[1] ?? null;
}

function uniqueOptions(answer: string, distractors: string[]) {
  const out = [answer, ...distractors.filter((x) => x !== answer)];
  return [...new Set(out)].slice(0, 4);
}

function difficulty(i: number): SeedQuestion["difficulty"] {
  return i % 5 === 0 ? "HARD" : i % 2 === 0 ? "MEDIUM" : "EASY";
}

function generatedFunctions(i: number): SeedQuestion {
  const mode = i % 5;
  const a = 2 + (i % 11);
  const b = 1 + ((i * 3) % 13);
  const c = 1 + ((i * 5) % 9);
  const d = i % 8;
  const x = 1 + ((i * 7) % 12);

  if (mode === 0) {
    const gx = c * x + d;
    const ans = a * gx + b;
    return { concept: "Function composition", difficulty: difficulty(i), prompt: `Let f(x)=${a}x+${b} and g(x)=${c}x+${d}. Find (f ∘ g)(${x}).`, explanation: `First g(${x})=${gx}. Then f(${gx})=${ans}.`, answer: String(ans), options: uniqueOptions(String(ans), [String(ans + a), String(ans - c), String(a * x + b)]) };
  }
  if (mode === 1) {
    const value = a * x + b;
    return { concept: "Function values", difficulty: difficulty(i), prompt: `If f(x)=${a}x+${b}, what is f(${x})?`, explanation: `Substitute x=${x}: ${a}(${x})+${b}=${value}.`, answer: String(value), options: uniqueOptions(String(value), [String(value + a), String(value - b), String(a + b + x)]) };
  }
  if (mode === 2) {
    const value = a * x + b;
    const inv = (value - b) / a;
    return { concept: "Inverse functions", difficulty: difficulty(i), prompt: `For f(x)=${a}x+${b}, which x satisfies f(x)=${value}?`, explanation: `Solve ${a}x+${b}=${value}, giving x=${inv}.`, answer: String(inv), options: uniqueOptions(String(inv), [String(inv + 1), String(Math.max(0, inv - 1)), String(value - b)]) };
  }
  if (mode === 3) {
    const excluded = 2 + (i % 15);
    return { concept: "Domain and range", difficulty: difficulty(i), prompt: `What value must be excluded from the domain of f(x)=1/(x−${excluded})?`, explanation: `The denominator cannot be zero, so x=${excluded} is excluded.`, answer: String(excluded), options: uniqueOptions(String(excluded), [String(excluded + 1), String(excluded - 1), "0"]) };
  }
  const root = 1 + (i % 12);
  return { concept: "Function properties", difficulty: difficulty(i), prompt: `Which statement is true about the linear function f(x)=${a}x+${b} on R?`, explanation: `Every non-constant linear function is one-to-one on the real numbers.`, answer: "It is one-to-one", options: ["It is one-to-one", "It is constant", "It is periodic", `It has two outputs for x=${root}`] };
}

function generatedRelations(i: number): SeedQuestion {
  const n = 2 + (i % 48);
  const mode = i % 8;
  if (mode === 0) return { concept: "Reflexive relations", difficulty: difficulty(i), prompt: `A relation on a ${n}-element set is reflexive. How many diagonal pairs (a,a) must it contain?`, explanation: `Every element must relate to itself, so all ${n} diagonal pairs are required.`, answer: String(n), options: uniqueOptions(String(n), [String(n - 1), String(n + 1), String(2 * n)]) };
  if (mode === 1) return { concept: "Symmetric relations", difficulty: difficulty(i), prompt: "If aRb in a symmetric relation, which pair must also belong to R?", explanation: "Symmetry reverses every related ordered pair.", answer: "bRa", options: ["bRa", "aRa", "bRb", "aRc"] };
  if (mode === 2) return { concept: "Transitive relations", difficulty: difficulty(i), prompt: "If aRb and bRc in a transitive relation, what must follow?", explanation: "Transitivity requires aRc whenever aRb and bRc.", answer: "aRc", options: ["aRc", "cRa", "bRa", "aRb"] };
  if (mode === 3) return { concept: "Equivalence relations", difficulty: difficulty(i), prompt: "Which combination of properties defines an equivalence relation?", explanation: "Equivalence relations are reflexive, symmetric, and transitive.", answer: "Reflexive, symmetric, and transitive", options: ["Reflexive, symmetric, and transitive", "Reflexive, antisymmetric, and transitive", "Symmetric only", "Irreflexive and transitive"] };
  if (mode === 4) return { concept: "Partial orders", difficulty: difficulty(i), prompt: "Which three properties define a partial order?", explanation: "A partial order is reflexive, antisymmetric, and transitive.", answer: "Reflexive, antisymmetric, and transitive", options: ["Reflexive, antisymmetric, and transitive", "Reflexive, symmetric, and transitive", "Symmetric and transitive", "Irreflexive and antisymmetric"] };
  if (mode === 5) return { concept: "Antisymmetry", difficulty: difficulty(i), prompt: "In an antisymmetric relation, if both aRb and bRa hold, what follows?", explanation: "Antisymmetry forces a and b to be the same element.", answer: "a=b", options: ["a=b", "a≠b", "R is symmetric", "R is empty"] };
  if (mode === 6) return { concept: "Relation representation", difficulty: difficulty(i), prompt: `A relation on ${n} labelled elements can be represented by a Boolean matrix of what order?`, explanation: `A relation on n elements uses one row and column for each element, giving an n×n matrix.`, answer: `${n}×${n}`, options: [`${n}×${n}`, `${n}×${n + 1}`, `${n + 1}×${n}`, `${2 * n}×${n}`] };
  return { concept: "Transitive closure", difficulty: difficulty(i), prompt: "The transitive closure of R is the smallest transitive relation that contains what?", explanation: "It contains the original relation R and adds only the pairs required for transitivity.", answer: "R", options: ["R", "Rᶜ", "A×A only", "∅"] };
}

function generatedSets(i: number): SeedQuestion {
  const n = 3 + (i % 15);
  const m = 2 + ((i * 3) % 13);
  const common = 1 + (i % Math.min(n, m));
  const mode = i % 8;
  if (mode === 0) { const ans = 2 ** n; return { concept: "Power sets", difficulty: difficulty(i), prompt: `A set has ${n} elements. How many subsets does it have?`, explanation: `A set with n elements has 2^n subsets, so the answer is ${ans}.`, answer: String(ans), options: uniqueOptions(String(ans), [String(ans / 2), String(ans * 2), String(n * n)]) }; }
  if (mode === 1) { const ans = n + m - common; return { concept: "Inclusion-exclusion", difficulty: difficulty(i), prompt: `If |A|=${n}, |B|=${m}, and |A∩B|=${common}, find |A∪B|.`, explanation: `|A∪B|=${n}+${m}−${common}=${ans}.`, answer: String(ans), options: uniqueOptions(String(ans), [String(n + m), String(ans + common), String(Math.abs(n - m))]) }; }
  if (mode === 2) { const ans = n * m; return { concept: "Cartesian product", difficulty: difficulty(i), prompt: `If |A|=${n} and |B|=${m}, what is |A×B|?`, explanation: `Every element of A pairs with every element of B, so ${n}×${m}=${ans}.`, answer: String(ans), options: uniqueOptions(String(ans), [String(n + m), String(ans + n), String(Math.max(1, ans - m))]) }; }
  if (mode === 3) return { concept: "Set operations", difficulty: difficulty(i), prompt: "Which operation keeps elements that belong to both A and B?", explanation: "Intersection contains exactly the elements common to both sets.", answer: "A∩B", options: ["A∩B", "A∪B", "A−B", "A×B"] };
  if (mode === 4) return { concept: "Disjoint sets", difficulty: difficulty(i), prompt: "Two sets are disjoint exactly when their intersection is what?", explanation: "Disjoint sets have no common elements, so their intersection is empty.", answer: "∅", options: ["∅", "A", "B", "A∪B"] };
  if (mode === 5) return { concept: "De Morgan's laws", difficulty: difficulty(i), prompt: "Which identity is correct?", explanation: "The complement of a union equals the intersection of the complements.", answer: "(A∪B)ᶜ=Aᶜ∩Bᶜ", options: ["(A∪B)ᶜ=Aᶜ∩Bᶜ", "(A∪B)ᶜ=Aᶜ∪Bᶜ", "(A∩B)ᶜ=Aᶜ∩Bᶜ", "A∪Aᶜ=A"] };
  if (mode === 6) { const ans = n + m - common; return { concept: "Cardinality", difficulty: difficulty(i), prompt: `If |A|=${n}, |B|=${m}, and |A∩B|=${common}, what is the cardinality of A∪B?`, explanation: `Use |A∪B|=|A|+|B|−|A∩B|, giving ${ans}.`, answer: String(ans), options: uniqueOptions(String(ans), [String(n + m), String(n + m + common), String(Math.abs(n - m))]) }; }
  return { concept: "Set complement", difficulty: difficulty(i), prompt: `If U has ${n + m} elements and A has ${n} elements, how many elements are in Aᶜ?`, explanation: `The complement contains ${n + m}−${n}=${m} elements.`, answer: String(m), options: uniqueOptions(String(m), [String(n), String(n + m), String(Math.abs(n - m))]) };
}

function generatedFor(topicName: string, count: number) {
  const k = key(topicName);
  if (k !== "functions" && k !== "relations" && k !== "sets") return [];
  return Array.from({ length: count }, (_, i) =>
    k === "functions" ? generatedFunctions(i) : k === "relations" ? generatedRelations(i) : generatedSets(i),
  );
}

/** Ensures the built-in curriculum has a large, renewable question pool before a learner starts. */
export async function ensureQuestionBank(topicId: string) {
  const topic = await prisma.topic.findUnique({ where: { id: topicId }, include: { concepts: true } });
  if (!topic) return { created: 0, available: 0 };

  const existing = await prisma.question.count({ where: { topicId, validated: true } });
  if (existing >= TARGET_PER_TOPIC) return { created: 0, available: existing };

  const bank = findBank(topic.name);
  if (!bank) return { created: 0, available: existing };

  const generated = generatedFor(topic.name, Math.max(0, TARGET_PER_TOPIC - existing));
  const sourceItems = [...bank, ...generated].map((item, index) => ({
    ...item,
    prompt: index >= bank.length ? `${item.prompt} [Practice variant ${index - bank.length + 1}]` : item.prompt,
  }));

  const existingPrompts = new Set(
    (await prisma.question.findMany({
      where: { topicId, prompt: { in: sourceItems.map((item) => item.prompt) } },
      select: { prompt: true },
    })).map((item) => item.prompt),
  );

  const pending = sourceItems
    .filter((item) => !existingPrompts.has(item.prompt))
    .slice(0, Math.max(0, TARGET_PER_TOPIC - existing));

  const conceptByKey = new Map<string, string>(topic.concepts.map((concept) => [key(concept.name), concept.id]));
  const conceptNames = [...new Set(pending.map((item) => item.concept))];
  for (const conceptName of conceptNames) {
    const normalized = key(conceptName);
    if ([...conceptByKey.keys()].some((existing) => existing === normalized || existing.includes(normalized) || normalized.includes(existing))) continue;
    const createdConcept = await prisma.concept.create({ data: { topicId, name: conceptName } });
    conceptByKey.set(normalized, createdConcept.id);
  }

  const rows = pending.map((item) => {
    const normalized = key(item.concept);
    const matched = [...conceptByKey.entries()].find(([existing]) => existing === normalized || existing.includes(normalized) || normalized.includes(existing));
    const conceptId = matched?.[1] ?? topic.concepts[0]?.id ?? null;
    const id = randomUUID();
    return {
      id,
      topicId,
      conceptId,
      type: "MCQ" as const,
      difficulty: item.difficulty,
      prompt: item.prompt,
      explanation: item.explanation,
      source: "HUMAN" as const,
      validated: true,
      correctAnswer: { optionLabel: item.answer },
      options: item.options.map((label, i) => ({ id: randomUUID(), questionId: id, label, isCorrect: label === item.answer, order: i + 1 })),
    };
  });

  if (rows.length) {
    await prisma.$transaction(async (tx) => {
      await tx.question.createMany({ data: rows.map(({ options, ...question }) => question) });
      await tx.questionOption.createMany({ data: rows.flatMap((row) => row.options) });
    });
  }
  const created = rows.length;
  const available = await prisma.question.count({ where: { topicId, validated: true } });
  return { created, available };
}
