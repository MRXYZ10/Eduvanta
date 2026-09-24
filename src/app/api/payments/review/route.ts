import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";

type JsonRow = Record<string, unknown>;

function pick(row: JsonRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return null;
}

function pickNumber(row: JsonRow, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (value == null) continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pickDate(row: JsonRow, keys: string[]): Date | null {
  const value = pick(row, keys);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function enumLabels(
  db: any,
  tableName: string,
  columnName: string,
): Promise<string[]> {
  const result = (await db.$queryRawUnsafe(
    `SELECT "udt_name" AS "udtName", "data_type" AS "dataType"
     FROM information_schema.columns
     WHERE "table_schema" = 'public'
       AND "table_name" = $1
       AND "column_name" = $2
     LIMIT 1`,
    tableName,
    columnName,
  )) as Array<{ udtName: string | null; dataType: string }>;

  const udtName = result[0]?.udtName;
  if (!udtName || result[0]?.dataType !== "USER-DEFINED") {
    return [];
  }

  const labels = (await db.$queryRawUnsafe(
    `SELECT e.enumlabel
     FROM pg_type t
     JOIN pg_enum e ON e.enumtypid = t.oid
     WHERE t.typname = $1
     ORDER BY e.enumsortorder`,
    udtName,
  )) as Array<{ enumlabel: string }>;

  return labels.map((row) => row.enumlabel);
}

async function statusValue(
  db: any,
  tableName: string,
  desired: string,
): Promise<{ sql: string; value: string }> {
  const labels = await enumLabels(db, tableName, "status");

  if (labels.length === 0) {
    return {
      sql: "$1",
      value: desired,
    };
  }

  const exact = labels.find(
    (label) => label.toUpperCase() === desired.toUpperCase(),
  );

  if (!exact) {
    throw new Error(
      `${tableName}.status enum does not contain ${desired}`,
    );
  }

  const info = await db.$queryRawUnsafe(
    `SELECT "udt_name" AS "udtName"
     FROM information_schema.columns
     WHERE "table_schema" = 'public'
       AND "table_name" = $1
       AND "column_name" = 'status'
     LIMIT 1`,
    tableName,
  );

  const typeName = info[0]?.udtName;
  if (!typeName) {
    return {
      sql: "$1",
      value: exact,
    };
  }

  return {
    sql: `CAST($1 AS "${typeName}")`,
    value: exact,
  };
}

async function getColumns(db: any, tableName: string) {
  return db.$queryRawUnsafe(
    `SELECT
       "column_name" AS "columnName",
       "data_type" AS "dataType",
       "is_nullable" AS "isNullable",
       "column_default" AS "columnDefault",
       "is_identity" AS "isIdentity"
     FROM information_schema.columns
     WHERE "table_schema" = 'public'
       AND "table_name" = $1
     ORDER BY "ordinal_position"`,
    tableName,
  );
}

function datePlusDays(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + Math.max(1, days));
  return date;
}

async function activateSubscription(
  db: any,
  payment: JsonRow,
  packageRow: JsonRow,
) {
  const userId = pick(payment, ["userId", "studentId"]);
  const packageId = pick(payment, ["packageId", "planId"]);

  if (!userId || !packageId) {
    throw new Error("Payment is missing userId or packageId.");
  }

  const packageName = pick(packageRow, [
    "name",
    "title",
    "planName",
  ]) ?? "Paid";

  const price =
    pickNumber(packageRow, [
      "price",
      "amount",
      "monthlyPrice",
      "yearlyPrice",
    ]) ??
    pickNumber(payment, [
      "amount",
      "price",
    ]) ??
    0;

  const durationDays =
    pickNumber(packageRow, [
      "durationDays",
      "days",
      "validityDays",
    ]) ??
    (packageName.toLowerCase().includes("year") ? 365 : 30);

  const startedAt = new Date();
  const expiresAt = datePlusDays(durationDays);

  const columns = await getColumns(db, "Subscription");

  const existing = await db.$queryRawUnsafe(
    `SELECT to_jsonb(s) AS data
     FROM "Subscription" s
     WHERE s."userId" = $1
     ORDER BY s."createdAt" DESC NULLS LAST
     LIMIT 1`,
    userId,
  );

  const activeStatus = await statusValue(db, "Subscription", "ACTIVE");

  const fieldValues = new Map<string, unknown>();

  for (const column of columns) {
    switch (column.columnName) {
      case "userId":
        fieldValues.set(column.columnName, userId);
        break;

      case "packageId":
        fieldValues.set(column.columnName, packageId);
        break;

      case "status":
        fieldValues.set(column.columnName, activeStatus.value);
        break;

      case "startedAt":
      case "startsAt":
      case "startDate":
      case "currentPeriodStart":
        fieldValues.set(column.columnName, startedAt);
        break;

      case "expiresAt":
      case "endAt":
      case "endDate":
      case "currentPeriodEnd":
        fieldValues.set(column.columnName, expiresAt);
        break;

      case "amount":
      case "price":
        fieldValues.set(column.columnName, price);
        break;

      case "planName":
      case "packageName":
        fieldValues.set(column.columnName, packageName);
        break;

      case "billingCycle":
      case "cycle":
        fieldValues.set(
          column.columnName,
          durationDays >= 365 ? "YEARLY" : "MONTHLY",
        );
        break;

      case "currency":
        fieldValues.set(column.columnName, "INR");
        break;

      case "createdAt":
      case "updatedAt":
        fieldValues.set(column.columnName, new Date());
        break;
    }
  }

  const missingRequired = columns
    .filter(
      (column: any) =>
        column.isNullable === "NO" &&
        column.columnDefault == null &&
        column.isIdentity !== "YES" &&
        !fieldValues.has(column.columnName),
    )
    .map((column: any) => column.columnName);

  if (missingRequired.length > 0) {
    throw new Error(
      `Subscription has required fields that the billing adapter does not know: ${missingRequired.join(", ")}`,
    );
  }

  if (existing[0]?.data) {
    const existingId = pick(existing[0].data, ["id"]);

    if (!existingId) {
      throw new Error("Existing Subscription row has no id.");
    }

    const updateColumns: string[] = [];
    const updateValues: unknown[] = [];
    let index = 1;

    for (const [column, value] of fieldValues) {
      if (column === "createdAt") continue;

      let expression = `$${index}`;

      if (column === "status") {
        expression = activeStatus.sql.replace("$1", `$${index}`);
      }

      updateColumns.push(`"${column}" = ${expression}`);
      updateValues.push(value);
      index += 1;
    }

    await db.$executeRawUnsafe(
      `UPDATE "Subscription"
       SET ${updateColumns.join(", ")}
       WHERE "id" = $${index}`,
      ...updateValues,
      existingId,
    );

    return existingId;
  }

  const insertColumns: string[] = [];
  const values: unknown[] = [];
  const placeholders: string[] = [];

  let index = 1;

  for (const [column, value] of fieldValues) {
    if (column === "createdAt" || column === "updatedAt") {
      if (
        columns.find((item: any) => item.columnName === column)?.columnDefault
      ) {
        continue;
      }
    }

    let expression = `$${index}`;

    if (column === "status") {
      expression = activeStatus.sql.replace("$1", `$${index}`);
    }

    insertColumns.push(`"${column}"`);
    placeholders.push(expression);
    values.push(value);
    index += 1;
  }

  const result = await db.$queryRawUnsafe(
    `INSERT INTO "Subscription"
     (${insertColumns.join(", ")})
     VALUES (${placeholders.join(", ")})
     RETURNING "id"`,
    ...values,
  );

  return result[0]?.id ?? null;
}

export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Admin access required." },
      { status: 403 },
    );
  }

  try {
    const payments = await prisma.$queryRawUnsafe<Array<{ data: JsonRow }>>(
      `SELECT to_jsonb(p) AS data
       FROM "Payment" p
       WHERE UPPER(CAST(p."status" AS text)) = 'PENDING'
       ORDER BY COALESCE(p."createdAt", NOW()) ASC`,
    );

    const result = [];

    for (const row of payments) {
      const payment = row.data;
      const userId = pick(payment, ["userId", "studentId"]);
      const packageId = pick(payment, ["packageId", "planId"]);

      let userData: JsonRow | null = null;
      let packageData: JsonRow | null = null;

      if (userId) {
        const users = await prisma.$queryRawUnsafe<Array<{ data: JsonRow }>>(
          `SELECT to_jsonb(u) AS data
           FROM "User" u
           WHERE u."id" = $1
           LIMIT 1`,
          userId,
        );
        userData = users[0]?.data ?? null;
      }

      if (packageId) {
        const packages = await prisma.$queryRawUnsafe<Array<{ data: JsonRow }>>(
          `SELECT to_jsonb(p) AS data
           FROM "Package" p
           WHERE p."id" = $1
           LIMIT 1`,
          packageId,
        );
        packageData = packages[0]?.data ?? null;
      }

      result.push({
        id: pick(payment, ["id"]),
        userId,
        packageId,
        transactionId: pick(payment, [
          "transactionId",
          "txnId",
          "upiTransactionId",
        ]),
        amount: pickNumber(payment, ["amount", "price"]),
        createdAt: pick(payment, ["createdAt", "submittedAt"]),
        user: {
          name: pick(userData ?? {}, [
            "fullName",
            "name",
            "displayName",
          ]),
          email: pick(userData ?? {}, ["email"]),
        },
        package: {
          name: pick(packageData ?? {}, [
            "name",
            "title",
            "planName",
          ]),
          price: pickNumber(packageData ?? {}, [
            "price",
            "amount",
            "monthlyPrice",
            "yearlyPrice",
          ]),
        },
      });
    }

    return NextResponse.json({ payments: result });
  } catch (error) {
    console.error("[payments/review:GET]", error);

    return NextResponse.json(
      {
        error: "PAYMENTS_UNAVAILABLE",
        message: "Could not load pending payments.",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Admin access required." },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();

    const paymentId =
      typeof body?.paymentId === "string"
        ? body.paymentId.trim()
        : "";

    const action =
      body?.action === "APPROVE" || body?.action === "REJECT"
        ? body.action
        : null;

    const note =
      typeof body?.note === "string"
        ? body.note.trim().slice(0, 500)
        : "";

    if (!paymentId || !action) {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST",
          message: "paymentId and action are required.",
        },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const paymentRows = await tx.$queryRawUnsafe<Array<{ data: JsonRow }>>(
        `SELECT to_jsonb(p) AS data
         FROM "Payment" p
         WHERE p."id" = $1
         LIMIT 1`,
        paymentId,
      );

      const payment = paymentRows[0]?.data;

      if (!payment) {
        throw new Error("PAYMENT_NOT_FOUND");
      }

      const currentStatus =
        pick(payment, ["status"])?.toUpperCase() ?? "";

      if (action === "APPROVE" && currentStatus === "APPROVED") {
        return {
          alreadyProcessed: true,
          status: "APPROVED",
        };
      }

      if (action === "REJECT" && currentStatus === "REJECTED") {
        return {
          alreadyProcessed: true,
          status: "REJECTED",
        };
      }

      if (currentStatus !== "PENDING") {
        throw new Error(
          `Payment cannot be ${action.toLowerCase()} from status ${currentStatus}.`,
        );
      }

      const desiredStatus = action === "APPROVE"
        ? await statusValue(tx, "Payment", "APPROVED")
        : await statusValue(tx, "Payment", "REJECTED");

      const paymentColumns = await getColumns(tx, "Payment");
      const noteColumn = paymentColumns.find((column: any) =>
        [
          "reviewNote",
          "adminNote",
          "note",
          "rejectionReason",
        ].includes(column.columnName),
      )?.columnName;

      if (noteColumn && note) {
        const expression = desiredStatus.sql.replace("$1", "$2");

        await tx.$executeRawUnsafe(
          `UPDATE "Payment"
           SET "status" = ${expression},
               "${noteColumn}" = $3
           WHERE "id" = $4`,
          desiredStatus.value,
          desiredStatus.value,
          note,
          paymentId,
        );
      } else {
        await tx.$executeRawUnsafe(
          `UPDATE "Payment"
           SET "status" = ${desiredStatus.sql.replace("$1", "$2")}
           WHERE "id" = $3`,
          desiredStatus.value,
          paymentId,
        );
      }

      if (action === "REJECT") {
        return {
          alreadyProcessed: false,
          status: "REJECTED",
        };
      }

      const packageId = pick(payment, [
        "packageId",
        "planId",
      ]);

      if (!packageId) {
        throw new Error("Payment has no packageId.");
      }

      const packages = await tx.$queryRawUnsafe<Array<{ data: JsonRow }>>(
        `SELECT to_jsonb(p) AS data
         FROM "Package" p
         WHERE p."id" = $1
         LIMIT 1`,
        packageId,
      );

      const packageData = packages[0]?.data;

      if (!packageData) {
        throw new Error("PACKAGE_NOT_FOUND");
      }

      const subscriptionId = await activateSubscription(
        tx,
        payment,
        packageData,
      );

      return {
        alreadyProcessed: false,
        status: "APPROVED",
        subscriptionId,
      };
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("[payments/review:POST]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Payment review failed.";

    return NextResponse.json(
      {
        error: "PAYMENT_REVIEW_FAILED",
        message,
      },
      { status: 500 },
    );
  }
}





