export interface JobStatusEvent {
  job_id: string;
  status: "completed" | "failed";
}

export interface SseClient {
  enqueue: (chunk: Uint8Array) => void;
}

const clients = new Set<SseClient>();

export function broadcast(data: JobStatusEvent) {
  console.log(`Broadcasting event:`, data);
  const message = `data: ${JSON.stringify(data)}\n\n`;
  const messageBuffer = new TextEncoder().encode(message);

  clients.forEach((client) => {
    client.enqueue(messageBuffer);
  });
}

export function addClient(client: SseClient) {
  clients.add(client);
  return () => {
    clients.delete(client);
  };
}
