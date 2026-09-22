"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";

type Plan = "STUDENT" | "PRO";

const plans = [
  {
    id: "STUDENT" as Plan,
    name: "Student",
    price: 199,
    description: "More AI help and tools for everyday studying.",
    features: [
      "More AI tutor questions",
      "Exam Mode",
      "Personalized study plans",
      "Advanced practice",
      "Mistake analysis",
    ],
  },
  {
    id: "PRO" as Plan,
    name: "Pro",
    price: 399,
    description: "A complete AI-powered learning experience.",
    features: [
      "Higher AI usage limits",
      "Advanced AI tutoring",
      "Full exam preparation",
      "Personalized learning path",
      "Advanced analytics",
      "Priority features",
    ],
  },
];

export default function PackagesPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const upiId = process.env.NEXT_PUBLIC_EDUVANTA_UPI_ID ?? "";
  const selectedPlanData = plans.find((plan) => plan.id === selectedPlan);

  const upiPaymentUrl =
    upiId && selectedPlanData
      ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent("EduVanta")}&am=${selectedPlanData.price}&cu=INR`
      : "";

  async function submitPayment() {
    if (!selectedPlan || !transactionId.trim()) return;

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/payments/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: selectedPlan,
          transactionId: transactionId.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Unable to submit payment.");
        return;
      }

      setMessage(
        "Payment submitted successfully. Your plan will be activated after verification."
      );
      setTransactionId("");
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-4 py-10 text-[#172033] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <Link
            href="/dashboard"
            className="mb-5 inline-block text-sm font-medium text-[#5267d9] hover:underline"
          >
            Back to Dashboard
          </Link>

          <div className="mb-3 inline-flex rounded-full bg-[#5267d9]/10 px-4 py-1.5 text-xs font-semibold text-[#5267d9]">
            EDUVANTA PLANS
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Upgrade your learning
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#667085] sm:text-base">
            Choose a plan and unlock more powerful AI learning tools.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="flex flex-col rounded-3xl border border-[#e4e7ec] bg-white p-7 shadow-sm">
            <h2 className="text-xl font-bold">Free</h2>
            <p className="mt-2 text-sm text-[#667085]">
              Get started with essential learning tools.
            </p>

            <div className="mt-6 text-4xl font-bold">&#8377;0</div>

            <div className="my-7 h-px bg-[#eef0f4]" />

            <ul className="space-y-4 text-sm text-[#475467]">
              <li>&#10003; Basic AI tutoring</li>
              <li>&#10003; Limited daily questions</li>
              <li>&#10003; Basic practice</li>
              <li>&#10003; Study progress tracking</li>
            </ul>

            <button
              disabled
              className="mt-8 w-full cursor-not-allowed rounded-xl bg-[#f2f4f7] px-5 py-3 text-sm font-semibold text-[#98a2b3]"
            >
              Current Plan
            </button>
          </div>

          {plans.map((plan) => (
            <div
              key={plan.id}
              className="relative flex flex-col rounded-3xl border border-[#5267d9] bg-white p-7 shadow-sm ring-2 ring-[#5267d9]/10 transition hover:-translate-y-1 hover:shadow-xl"
            >
              {plan.id === "STUDENT" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#5267d9] px-4 py-1 text-xs font-bold text-white">
                  MOST POPULAR
                </div>
              )}

              <h2 className="text-xl font-bold">{plan.name}</h2>

              <p className="mt-2 min-h-12 text-sm leading-5 text-[#667085]">
                {plan.description}
              </p>

              <div className="mt-6">
                <span className="text-4xl font-bold">&#8377;{plan.price}</span>
                <span className="ml-1 text-sm text-[#667085]">/month</span>
              </div>

              <div className="my-7 h-px bg-[#eef0f4]" />

              <ul className="space-y-4 text-sm text-[#475467]">
                {plan.features.map((feature) => (
                  <li key={feature}>&#10003; {feature}</li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => {
                  setSelectedPlan(plan.id);
                  setMessage("");
                }}
                className="mt-8 w-full rounded-xl bg-[#5267d9] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4356c7]"
              >
                Pay &#8377;{plan.price} via UPI
              </button>
            </div>
          ))}
        </div>

        {selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">Pay via UPI</h2>
                  <p className="mt-1 text-sm text-[#667085]">
                    Complete the payment and enter your transaction ID.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlan(null);
                    setMessage("");
                  }}
                  className="text-xl text-[#98a2b3] hover:text-[#172033]"
                >
                  X
                </button>
              </div>

              <div className="mt-6 rounded-2xl bg-[#f7f9fc] p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#667085]">
                  Amount to pay
                </p>

                <p className="mt-1 text-3xl font-bold">
                  &#8377;{plans.find((p) => p.id === selectedPlan)?.price}
                </p>

                <div className="mt-4 rounded-xl border border-dashed border-[#d0d5dd] bg-white p-4">
                  <p className="text-sm font-semibold">UPI payment</p>
                  <p className="mt-1 text-xs text-[#667085]">
                    UPI ID: {process.env.NEXT_PUBLIC_EDUVANTA_UPI_ID}
                  </p>
                  {upiPaymentUrl && (
                    <div className="mt-4 flex flex-col items-center">
                      <div className="rounded-2xl border border-[#e4e7ec] bg-white p-3 shadow-sm">
                        <QRCodeSVG
                          value={upiPaymentUrl}
                          size={180}
                          includeMargin
                          bgColor="#ffffff"
                          fgColor="#111827"
                        />
                      </div>
                      <p className="mt-2 text-xs font-medium text-[#667085]">
                        Scan this QR with any UPI app
                      </p>
                    </div>
                  )}

                  <p className="mt-3 text-xs font-medium text-[#5267d9]">
                    Payment instructions
                  </p>
                </div>
              </div>

              <label className="mt-6 block text-sm font-semibold">
                UPI Transaction ID
                <input
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter your transaction ID"
                  maxLength={100}
                  className="mt-2 w-full rounded-xl border border-[#d0d5dd] px-4 py-3 text-sm outline-none transition focus:border-[#5267d9] focus:ring-2 focus:ring-[#5267d9]/10"
                />
              </label>

              {message && (
                <div className="mt-4 rounded-xl bg-[#f0fdf4] p-3 text-sm text-[#15803d]">
                  {message}
                </div>
              )}

              <button
                type="button"
                disabled={!transactionId.trim() || submitting}
                onClick={submitPayment}
                className="mt-5 w-full rounded-xl bg-[#5267d9] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4356c7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit for Verification"}
              </button>

              <p className="mt-4 text-center text-[11px] leading-5 text-[#98a2b3]">
                Your plan will be activated after the payment is verified by
                EduVanta.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

