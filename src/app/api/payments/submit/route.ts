import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  plan: z.enum(["STUDENT", "PRO"]),
  transactionId: z.string().trim().min(4).max(100),
});

const PLAN_PRICES = {
  STUDENT: 199,
  PRO: 399,
} as const;

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payment details" },
        { status: 400 }
      );
    }

    const { plan, transactionId } = parsed.data;
    const amount = PLAN_PRICES[plan];

    const existingPayment = await prisma.payment.findUnique({
      where: { transactionId },
    });

    if (existingPayment) {
      return NextResponse.json(
        { error: "This transaction ID has already been submitted." },
        { status: 409 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        plan,
        amount,
        transactionId,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      status: payment.status,
      message: "Payment submitted for verification.",
    });
  } catch (error) {
    console.error("[PAYMENT SUBMIT]", error);

    return NextResponse.json(
      { error: "Unable to submit payment." },
      { status: 500 }
    );
  }
}
