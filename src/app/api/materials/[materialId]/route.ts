import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: { materialId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const material = await prisma.learningMaterial.findUnique({ where: { id: params.materialId } });
  if (!material) return NextResponse.json({ error: "Material not found" }, { status: 404 });

  // Uploaded study material is private to its uploader unless an admin
  // explicitly removes it. Teachers should not be able to delete another
  // user's material merely because they have a teacher role.
  if (material.uploaderId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "You can't remove material you didn't upload" }, { status: 403 });
  }

  await prisma.learningMaterial.delete({ where: { id: params.materialId } }); // cascades to chunks
  return NextResponse.json({ deleted: true });
}
