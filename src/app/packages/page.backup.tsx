"use client";

import { useState } from "react";
import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "/month",
    description: "Get started with essential AI learning tools.",
    features: [
      "Basic AI tutoring",
      "Limited daily questions",
      "Basic practice",
      "Study progress tracking",
    ],
    button: "Current Plan",
    featured: false,
  },
  {
    name: "Student",
    price: "₹199",
    period: "/month",
    description: "More tools and AI help for everyday studying.",
    features: [
      "More AI tutor questions",
      "Exam Mode",
      "Personalized study plans",
      "Advanced practice",
      "Mistake analysis",
    ],
    button: "Upgrade to Student",
    featured: true,
  },
  {
    name: "Pro",
    price: "₹399",
    period: "/month",
    description: "A complete AI-powered learning experience.",
    features: [
      "Higher AI usage limits",
      "Advanced AI tutoring",
      "Full exam preparation",
      "Personalized learning path",
      "Advanced analytics",
      "Priority features",
    ],
    button: "Upgrade to Pro",
    featured: false,
  },
];

export default function PackagesPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-4 py-10 text-[#172033] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <Link
            href="/dashboard"
            className="mb-5 inline-block text-sm font-medium text-[#5267d9] hover:underline"
          >
            ← Back to Dashboard
          </Link>

          <div className="mb-3 inline-flex rounded-full bg-[#5267d9]/10 px-4 py-1.5 text-xs font-semibold text-[#5267d9]">
            EDUVANTA PLANS
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Choose your learning plan
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#667085] sm:text-base">
            Unlock more AI tutoring, exam preparation and personalized
            learning tools as you progress.
          </p>

          <div className="mt-7 inline-flex items-center rounded-full border border-[#e4e7ec] bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                !yearly
                  ? "bg-[#172033] text-white"
                  : "text-[#667085] hover:text-[#172033]"
              }`}
            >
              Monthly
            </button>

            <button
              type="button"
              onClick={() => setYearly(true)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                yearly
                  ? "bg-[#172033] text-white"
                  : "text-[#667085] hover:text-[#172033]"
              }`}
            >
              Yearly
              <span className="ml-2 text-xs text-emerald-600">
                Save more
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const yearlyPrice =
              plan.name === "Free"
                ? "₹0"
                : plan.name === "Student"
                  ? "₹1,990"
                  : "₹3,990";

            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-3xl border bg-white p-7 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl ${
                  plan.featured
                    ? "border-[#5267d9] ring-2 ring-[#5267d9]/10"
                    : "border-[#e4e7ec]"
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#5267d9] px-4 py-1 text-xs font-bold text-white shadow-sm">
                    MOST POPULAR
                  </div>
                )}

                <h2 className="text-xl font-bold">{plan.name}</h2>

                <p className="mt-2 min-h-12 text-sm leading-5 text-[#667085]">
                  {plan.description}
                </p>

                <div className="mt-6">
                  <span className="text-4xl font-bold">
                    {yearly ? yearlyPrice : plan.price}
                  </span>
                  <span className="ml-1 text-sm text-[#667085]">
                    {plan.period}
                  </span>
                </div>

                {yearly && plan.name !== "Free" && (
                  <p className="mt-2 text-xs font-medium text-emerald-600">
                    2 months free with yearly billing
                  </p>
                )}

                <div className="my-7 h-px bg-[#eef0f4]" />

                <ul className="space-y-4">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm text-[#475467]"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-600">
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={plan.name === "Free"}
                  className={`mt-8 w-full rounded-xl px-5 py-3 text-sm font-semibold transition ${
                    plan.name === "Free"
                      ? "cursor-not-allowed bg-[#f2f4f7] text-[#98a2b3]"
                      : plan.featured
                        ? "bg-[#5267d9] text-white hover:bg-[#4356c7]"
                        : "border border-[#d0d5dd] bg-white text-[#172033] hover:bg-[#f9fafb]"
                  }`}
                >
                  {plan.button}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-[#98a2b3]">
          Plans and limits can be changed before payments are connected.
        </p>
      </div>
    </main>
  );
}
