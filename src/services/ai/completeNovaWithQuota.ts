import { cookies } from "next/headers";
import { completeWithRetry } from "@/services/ai/factory";
import {
  getNovaEntitlements,
} from "@/services/billing/entitlements";
import {
  finalizeNovaQuota,
  releaseNovaQuota,
  reserveNovaQuota,
  type NovaQuotaReservation,
} from "@/services/billing/novaQuota";
import {
  isNovaMode,
  NOVA_MODES,
  type NovaMode,
} from "@/services/nova/modes";
import { getCurrentUser } from "@/lib/auth";

function readModeFromCookie(): NovaMode {
  try {
    const value = cookies().get("eduvanta_nova_mode")?.value ?? "TUTOR";
    return isNovaMode(value) ? value : "TUTOR";
  } catch {
    return "TUTOR";
  }
}

function addModeInstruction(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  mode: NovaMode,
) {
  const instruction = [
    `ACTIVE NOVA MODE: ${NOVA_MODES[mode].label}`,
    NOVA_MODES[mode].systemInstruction,
    "Stay consistent with this mode for the current response.",
  ].join("\n");

  const output = [...messages];
  const systemIndex = output.findIndex(
    (message) => message.role === "system",
  );

  if (systemIndex >= 0) {
    output[systemIndex] = {
      ...output[systemIndex],
      content: `${output[systemIndex].content}\n\n${instruction}`,
    };
  } else {
    output.unshift({
      role: "system",
      content: instruction,
    });
  }

  return output;
}

function parseUsage(response: unknown): {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
} {
  const usage = (response as {
    usage?: Record<string, unknown>;
  })?.usage ?? {};

  const inputTokens = Number(
    usage.inputTokens ??
    usage.promptTokens ??
    usage.prompt_tokens ??
    0,
  );

  const outputTokens = Number(
    usage.outputTokens ??
    usage.completionTokens ??
    usage.completion_tokens ??
    0,
  );

  const totalTokens = Number(
    usage.totalTokens ??
    usage.total_tokens ??
    (inputTokens + outputTokens),
  );

  return {
    inputTokens: Number.isFinite(inputTokens) ? inputTokens : 0,
    outputTokens: Number.isFinite(outputTokens) ? outputTokens : 0,
    totalTokens: Number.isFinite(totalTokens) ? totalTokens : 0,
  };
}

export async function completeNovaWithQuota(
  req: Parameters<typeof completeWithRetry>[0],
) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const mode = readModeFromCookie();
  const entitlements = await getNovaEntitlements(user.id);

  if (!entitlements.modes.includes(mode)) {
    throw new Error(
      `NOVA_MODE_LOCKED:${mode}:${entitlements.planName}`,
    );
  }

  const messages = addModeInstruction(
    req.messages as Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }>,
    mode,
  );

  let reservation: NovaQuotaReservation | null = null;

  try {
    reservation = await reserveNovaQuota(
      user.id,
      mode,
      messages,
      req.maxTokens,
    );

    const response = await completeWithRetry({
      ...req,
      messages,
    });

    const usage = parseUsage(response);

    await finalizeNovaQuota(
      reservation,
      {
        ...usage,
        provider: String(
          (response as { provider?: unknown }).provider ?? "unknown",
        ),
        model: String(
          (response as { model?: unknown }).model ?? "unknown",
        ),
        mode,
      },
    );

    reservation = null;

    return response;
  } catch (error) {
    if (reservation) {
      await releaseNovaQuota(reservation.requestId).catch(() => {});
    }

    throw error;
  }
}