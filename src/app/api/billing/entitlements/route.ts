import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getNovaEntitlements } from "@/services/billing/entitlements";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Please log in." },
        { status: 401 },
      );
    }

    const nova = await getNovaEntitlements(user.id);

    return NextResponse.json({
      plan: {
        name: nova.planName,
        paid: nova.paid,
      },
      nova,
    });
  } catch (error) {
    console.error("[billing/entitlements]", error);

    return NextResponse.json(
      {
        error: "BILLING_UNAVAILABLE",
        message: "Billing information is temporarily unavailable.",
      },
      { status: 500 },
    );
  }
}