import { playJoinSound, playScreenShareSound } from "./sounds";

// Single mock context shared across tests — the sounds module caches it after first call
const mockOsc = () => ({
  type: "sine" as OscillatorType,
  frequency: { value: 0 },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
});

const mockGain = () => ({
  gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
});

const mockCtx = {
  state: "running",
  currentTime: 0,
  destination: {},
  resume: vi.fn(),
  createOscillator: vi.fn(mockOsc),
  createGain: vi.fn(mockGain),
};

vi.stubGlobal("AudioContext", vi.fn(function () { return mockCtx; }));

beforeEach(() => {
  mockCtx.createOscillator.mockClear();
  mockCtx.createGain.mockClear();
});

describe("playJoinSound", () => {
  it("plays two notes (two oscillators)", () => {
    playJoinSound();
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
    expect(mockCtx.createGain).toHaveBeenCalledTimes(2);
  });
});

describe("playScreenShareSound", () => {
  it("plays three notes (three oscillators)", () => {
    playScreenShareSound();
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(3);
    expect(mockCtx.createGain).toHaveBeenCalledTimes(3);
  });
});
