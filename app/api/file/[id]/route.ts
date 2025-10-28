import { NextResponse } from "next/server";
import { ittybit } from "@/lib/ittybit";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { filename } = await req.json();
  const response = await ittybit.files.update(params.id, { filename });
  return NextResponse.json(response);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const response = await ittybit.files.delete(params.id);
  return NextResponse.json(response);
}
