import { NextResponse } from "next/server";
import { ittybit } from "@/lib/ittybit";

export async function GET() {
  const filesList = await ittybit.files.list();
  return NextResponse.json(filesList);
}
