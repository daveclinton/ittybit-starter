import { NextResponse } from "next/server";
import { ittybit } from "@/lib/ittybit";

export async function POST(req: Request) {
  const { filename } = await req.json();

  const signature = await ittybit.signatures.create({
    filename,
    folder: "uploads",
    method: "put",
    expiry: Math.floor(Date.now() / 1000) + 3600,
  });

  return NextResponse.json(signature);
}
