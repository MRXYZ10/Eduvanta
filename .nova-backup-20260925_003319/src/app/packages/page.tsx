"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { Check, Sparkles, X } from "lucide-react";

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
      ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
          "EduVanta",
        )}&am=${selectedPlanData.price}&cu=INR`
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
        "Payment submitted successfully. Your plan will be activated after verification.",
      );
      setTransactionId("");
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh bg-paper px-4 py-8 text-ink sm:px-6 lg:px-10 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <Link
            href="/dashboard"
            className="mb-5 inline-flex items-center rounded-full border border-line/70 bg-paper/70 px-3 py-1.5 text-xs font-medium text-cobalt transition-colors hover:bg-cobalt-soft"
          >
            ← Back to Dashboard
          </Link>

          <div className="rounded-3xl border border-line/70 bg-paper/60 p-6 shadow-sm sm:p-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-signal/25 bg-signal-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-signal">
              <Sparkles className="h-3 w-3" strokeWidth={2} />
              EduVanta plans
            </div>

            <h1 className="text-3xl tracking-tight sm:text-5xl">
              Upgrade your learning
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/60 sm:text-base">
              Choose a plan and unlock more powerful AI learning tools.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="flex flex-col rounded-3xl border border-line/70 bg-paper/60 p-6 shadow-sm sm:p-7">
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink/40">
              Starter
            </div>

            <h2 className="mt-2 text-xl font-medium">Free</h2>

            <p className="mt-2 text-sm leading-6 text-ink/55">
              Get started with essential learning tools.
            </p>

            <div className="mt-6 text-4xl font-serif tracking-tight">
              ₹0
            </div>

            <div className="my-6 h-px bg-line/60" />

            <ul className="space-y-3 text-sm text-ink/65">
              {[
                "Basic AI tutoring",
                "Limited daily questions",
                "Basic practice",
                "Study progress tracking",
              ].map((feature) => (
                <li key={feature} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-mastery-mastered" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              disabled
              className="mt-8 w-full rounded-xl border border-line/60 bg-ink/5 px-5 py-3 text-sm font-medium text-ink/35"
            >
              Current Plan
            </button>
          </div>

          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-3xl border p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg sm:p-7 ${
                plan.id === "STUDENT"
                  ? "border-cobalt/40 bg-cobalt-soft/25"
                  : "border-line/70 bg-paper/60"
              }`}
            >
              {plan.id === "STUDENT" && (
                <div className="absolute -top-3 left-6 rounded-full bg-cobalt px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                  Popular
                </div>
              )}

              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink/40">
                Premium
              </div>

              <h2 className="mt-2 text-xl font-medium">{plan.name}</h2>

              <p className="mt-2 min-h-12 text-sm leading-6 text-ink/55">
                {plan.description}
              </p>

              <div className="mt-6">
                <span className="text-4xl font-serif tracking-tight">
                  ₹{plan.price}
                </span>
                <span className="ml-1 text-sm text-ink/45">/month</span>
              </div>

              <div className="my-6 h-px bg-line/60" />

              <ul className="space-y-3 text-sm text-ink/65">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-cobalt" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => {
                  setSelectedPlan(plan.id);
                  setMessage("");
                }}
                className="mt-8 w-full rounded-xl bg-cobalt px-5 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-cobalt/95 hover:shadow-md"
              >
                Pay ₹{plan.price} via UPI
              </button>
            </div>
          ))}
        </div>

        {selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
            <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-line/70 bg-paper p-6 shadow-2xl sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-signal">
                    UPI payment
                  </div>

                  <h2 className="mt-1 text-xl font-medium">
                    Complete your payment
                  </h2>

                  <p className="mt-1 text-sm text-ink/55">
                    Complete the payment and enter your transaction ID.
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Close payment dialog"
                  onClick={() => {
                    setSelectedPlan(null);
                    setMessage("");
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink"
                >
                  <X className="h-5 w-5" strokeWidth={1.8} />
                </button>
              </div>

              <div className="mt-6 rounded-2xl border border-line/60 bg-ink/5 p-5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink/40">
                  Amount to pay
                </p>

                <p className="mt-1 text-3xl font-serif">
                  ₹{selectedPlanData?.price}
                </p>

                <div className="mt-5 rounded-2xl border border-line/60 bg-paper p-4">
                  <p className="text-sm font-medium">UPI payment</p>

                  <p className="mt-1 break-all text-xs text-ink/50">
                    UPI ID: {upiId}
                  </p>

                  {upiPaymentUrl && (
                    <div className="mt-4 flex flex-col items-center">
                      <div className="rounded-2xl border border-line/70 bg-white p-3 shadow-sm">
                        <QRCodeSVG
                          value={upiPaymentUrl}
                          size={180}
                          includeMargin
                          bgColor="#ffffff"
                          fgColor="#111827"
                        />
                      </div>

                      <p className="mt-2 text-xs text-ink/45">
                        Scan this QR with any UPI app
                      </p>
                    </div>
                  )}

                  <p className="mt-4 text-xs font-medium text-cobalt">
                    Payment instructions
                  </p>
                </div>
              </div>

              <label className="mt-6 block text-sm font-medium">
                UPI Transaction ID

                <input
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter your transaction ID"
                  maxLength={100}
                  className="mt-2 w-full rounded-xl border border-line/70 bg-paper px-4 py-3 text-sm text-ink outline-none transition focus:border-cobalt focus:ring-2 focus:ring-cobalt/10"
                />
              </label>

              {message && (
                <div className="mt-4 rounded-xl border border-mastery-mastered/20 bg-mastery-mastered/10 p-3 text-sm leading-5 text-mastery-mastered">
                  {message}
                </div>
              )}

              <button
                type="button"
                disabled={!transactionId.trim() || submitting}
                onClick={submitPayment}
                className="mt-5 w-full rounded-xl bg-cobalt px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-cobalt/95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit for Verification"}
              </button>

              <p className="mt-4 text-center text-[11px] leading-5 text-ink/35">
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