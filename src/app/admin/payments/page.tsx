"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PaymentItem {
  id: string | null;
  userId: string | null;
  packageId: string | null;
  transactionId: string | null;
  amount: number | null;
  createdAt: string | null;
  user: {
    name: string | null;
    email: string | null;
  };
  package: {
    name: string | null;
    price: number | null;
  };
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/payments/review", {
        cache: "no-store",
      });

      const text = await response.text();

      let body: {
        payments?: PaymentItem[];
        message?: string;
      } = {};

      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = {};
      }

      if (!response.ok) {
        throw new Error(
          body.message ?? `Request failed (${response.status})`,
        );
      }

      setPayments(body.payments ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load payments.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function review(
    paymentId: string,
    action: "APPROVE" | "REJECT",
  ) {
    setBusyId(paymentId);
    setError("");

    try {
      const response = await fetch("/api/payments/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentId,
          action,
        }),
      });

      const text = await response.text();

      let body: { message?: string } = {};

      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = {};
      }

      if (!response.ok) {
        throw new Error(
          body.message ?? `Review failed (${response.status})`,
        );
      }

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Payment review failed.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/35">
              EduVanta Admin
            </p>
            <h1 className="mt-1 text-2xl tracking-tight">
              Payment review
            </h1>
            <p className="mt-1 text-sm text-ink/55">
              Approve a payment to activate the student's package subscription.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink/65 hover:bg-ink/5"
          >
            ← Admin dashboard
          </Link>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-mastery-attention/20 bg-mastery-attention/5 px-4 py-3 text-sm text-mastery-attention">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-[2rem] border border-line/70 bg-paper/70 p-8 text-sm text-ink/50">
            Loading pending payments...
          </div>
        ) : payments.length === 0 ? (
          <div className="rounded-[2rem] border border-line/70 bg-paper/70 p-8 text-sm text-ink/50">
            No pending payments right now.
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => {
              const id = payment.id ?? "";
              const date = payment.createdAt
                ? new Date(payment.createdAt).toLocaleString("en-IN")
                : "Unknown";

              return (
                <article
                  key={id}
                  className="rounded-[2rem] border border-line/70 bg-paper/70 p-5 shadow-sm sm:p-6"
                >
                  <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-cobalt-soft px-2.5 py-1 text-[10px] font-semibold text-cobalt">
                          PENDING
                        </span>

                        <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[10px] font-medium text-ink/50">
                          {date}
                        </span>
                      </div>

                      <h2 className="mt-4 text-lg font-semibold">
                        {payment.package.name ?? "Package"}
                      </h2>

                      <p className="mt-1 text-sm text-ink/55">
                        {payment.user.name ?? "Student"}
                        {payment.user.email
                          ? ` · ${payment.user.email}`
                          : ""}
                      </p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-ink/[0.03] p-3">
                          <p className="text-[10px] uppercase tracking-wider text-ink/30">
                            Amount
                          </p>
                          <p className="mt-1 font-semibold">
                            ₹{(payment.amount ?? payment.package.price ?? 0).toLocaleString("en-IN")}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-ink/[0.03] p-3 sm:col-span-2">
                          <p className="text-[10px] uppercase tracking-wider text-ink/30">
                            Transaction ID
                          </p>
                          <p className="mt-1 break-all font-mono text-xs text-ink/70">
                            {payment.transactionId ?? "Not provided"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 lg:flex-col lg:justify-center">
                      <button
                        type="button"
                        disabled={busyId === id}
                        onClick={() => void review(id, "APPROVE")}
                        className="rounded-2xl bg-ink px-5 py-3 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                      >
                        {busyId === id ? "Working..." : "Approve & Activate"}
                      </button>

                      <button
                        type="button"
                        disabled={busyId === id}
                        onClick={() => void review(id, "REJECT")}
                        className="rounded-2xl border border-line px-5 py-3 text-xs font-semibold text-ink/60 hover:bg-ink/5 disabled:opacity-40"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}