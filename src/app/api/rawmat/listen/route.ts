import { NextResponse } from "next/server";
import { broadcast, JobStatusEvent } from "@/lib/sse-broadcaster";

export async function POST(request: Request) {
  const payload = await request.json();
  const { status } = payload as JobStatusEvent;

  if (status) {
    broadcast(payload as JobStatusEvent);
  }

  return NextResponse.json(
    { message: "Webhook processed successfully" },
    { status: 200 }
  );
}
