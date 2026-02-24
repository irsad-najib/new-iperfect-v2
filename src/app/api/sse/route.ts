// app/api/sse/route.ts
export const dynamic = "force-dynamic";
import { addClient, SseClient } from "@/lib/sse-broadcaster";

export async function GET() {
  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Transfer-Encoding": "chunked",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Access-Control-Allow-Origin": "*",
  };

  let heartbeat: NodeJS.Timeout | null = null;
  let removeClient: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const client: SseClient = {
        enqueue: (chunk: Uint8Array) => controller.enqueue(chunk),
      };

      removeClient = addClient(client);

      // Send heartbeat to keep the connection alive
      heartbeat = setInterval(() => {
        controller.enqueue(new TextEncoder().encode(":ping\n\n"));
      }, 30000);
    },
    async cancel() {
      // Clear heartbeat interval and remove the client
      if (heartbeat) {
        clearInterval(heartbeat);
      }

      if (removeClient) {
        removeClient();
      }
    },
  });

  return new Response(stream, { headers });
}
