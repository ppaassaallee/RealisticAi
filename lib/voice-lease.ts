// Share a single live-demo slot across Alex/Juliana tabs on this browser origin.
export async function acquireVoiceLease(): Promise<() => void> {
  if (!navigator.locks) return () => {};
  return new Promise((resolve, reject) => {
    void navigator.locks
      .request("ai-kiosk-live-voice", { ifAvailable: true }, async (lock) => {
        if (!lock) {
          reject(
            new Error(
              "Another demo call is active in this browser. Close it before starting another. / Cerrá la otra llamada antes de iniciar esta.",
            ),
          );
          return;
        }
        await new Promise<void>((release) => resolve(release));
      })
      .catch(reject);
  });
}
