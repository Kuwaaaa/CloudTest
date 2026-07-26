import { NextResponse } from "next/server";

import { deleteCommand, isUserSavedCommand, readCommands, upsertCommand } from "@/lib/commands-store";

export async function GET() {
  try {
    return NextResponse.json(await readCommands());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read commands";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();

  if (!isUserSavedCommand(body)) {
    return NextResponse.json({ error: "Invalid command payload" }, { status: 400 });
  }

  await upsertCommand(body);

  return NextResponse.json({ success: true, command: body });
}

export async function DELETE(req: Request) {
  const body = await req.json();

  if (!body || typeof body.id !== "string") {
    return NextResponse.json({ error: "Invalid command id" }, { status: 400 });
  }

  await deleteCommand(body.id);

  return NextResponse.json({ success: true });
}
