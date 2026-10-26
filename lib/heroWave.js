// The hero loader's shared clock. HeroPortrait starts the wave once its image
// and font are ready; every DecodeText in the hero subscribes and lands its
// letters as the wave front reaches them. Never started = text stays as
// server-rendered (repeat visits, reduced motion, slow loads, image errors).

export function createWave() {
  let started = null;
  const subscribers = new Set();
  return {
    // First call wins: one wave per page load.
    start(t0, origin) {
      if (started) return;
      started = { t0, origin };
      for (const cb of subscribers) cb(started);
    },
    // Called at once if the wave already started. Returns unsubscribe.
    subscribe(cb) {
      if (started) cb(started);
      else subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
  };
}

export const heroWave = createWave();
