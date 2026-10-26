import { createWave } from "@/lib/heroWave";

const origin = { x: 10, y: 20 };

test("subscriber added before start is called once", () => {
  const wave = createWave();
  const calls = [];
  wave.subscribe((w) => calls.push(w));
  wave.start(5, origin);
  expect(calls).toEqual([{ t0: 5, origin }]);
});

test("subscriber added after start is called immediately", () => {
  const wave = createWave();
  wave.start(5, origin);
  const calls = [];
  wave.subscribe((w) => calls.push(w));
  expect(calls).toEqual([{ t0: 5, origin }]);
});

test("a second start is ignored", () => {
  const wave = createWave();
  const calls = [];
  wave.subscribe((w) => calls.push(w));
  wave.start(5, origin);
  wave.start(9, { x: 0, y: 0 });
  expect(calls).toEqual([{ t0: 5, origin }]);
});

test("unsubscribe stops future calls", () => {
  const wave = createWave();
  const calls = [];
  const off = wave.subscribe((w) => calls.push(w));
  off();
  wave.start(5, origin);
  expect(calls).toEqual([]);
});
