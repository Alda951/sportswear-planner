import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body   = await req.json();
    const { status } = body;

    const validStatuses = ["IN_DEVELOPMENT", "IN_MANUFACTURE", "IN_REVIEW", "LAUNCHED"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data:  { ...(status && { status }) },
    });

    return NextResponse.json({ product });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
