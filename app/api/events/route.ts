import { snapshot } from "@/lib/store";
import { sid, staffAllowed } from "@/lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const staff = new URL(req.url).searchParams.has("staff");
  if (staff && !(await staffAllowed(req)))
    return new Response("Unauthorized", { status: 401 });
  const id = await sid();
  let timer: ReturnType<typeof setInterval>;
  let close: () => void = () => {};
  const stream = new ReadableStream({
    start(controller) {
      let last = "";
      let stopped = false;
      close = () => {
        if (stopped) return;
        stopped = true;
        clearInterval(timer);
        req.signal.removeEventListener("abort", close);
        try {
          controller.close();
        } catch {}
      };
      const send = () => {
        try {
          const data = JSON.stringify(snapshot(id, staff));
          if (data !== last) {
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            last = data;
          } else
            controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        } catch {
          close();
        }
      };
      timer = setInterval(send, 750);
      req.signal.addEventListener("abort", close, { once: true });
      send();
    },
    cancel() {
      close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
