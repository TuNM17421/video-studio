import { afterEach, describe, expect, it } from "vitest";
import { clearKaggleCreds, hasKaggleCreds, kaggleEnv, kaggleUsername, parseKaggleJson, redactKaggle, setKaggleCreds } from "./kaggle-creds";

const LEGACY = "0123456789abcdef0123456789abcdef";

describe("Kaggle credentials", () => {
  afterEach(() => { clearKaggleCreds(); });

  it("parses the file downloaded from Account → Create New Token", () => {
    expect(parseKaggleJson('{"username":"thai","key":"abc123def456"}')).toEqual({ username: "thai", key: "abc123def456" });
  });

  it("rejects a kaggle.json missing a field", () => {
    expect(() => parseKaggleJson('{"username":"thai"}')).toThrow();
  });

  it("rejects non-JSON content", () => {
    expect(() => parseKaggleJson("not json")).toThrow();
  });

  it("stays empty until credentials are set, then hands a legacy key to the CLI as username/key", () => {
    expect(hasKaggleCreds()).toBe(false);
    setKaggleCreds("thai", LEGACY);
    expect(hasKaggleCreds()).toBe(true);
    expect(kaggleUsername()).toBe("thai");
    const env = kaggleEnv();
    expect(env.KAGGLE_USERNAME).toBe("thai");
    expect(env.KAGGLE_KEY).toBe(LEGACY);
    expect(env.KAGGLE_API_TOKEN).toBeUndefined();
  });

  it("passes a new-style access token as KAGGLE_API_TOKEN, not as a legacy key", () => {
    setKaggleCreds("thai", "KGAT_abcdefghijklmnop");
    const env = kaggleEnv();
    expect(env.KAGGLE_API_TOKEN).toBe("KGAT_abcdefghijklmnop");
    expect(env.KAGGLE_KEY).toBeUndefined();
  });

  it("isolates the CLI from credentials already on this machine", () => {
    const before = process.env.KAGGLE_API_TOKEN;
    process.env.KAGGLE_API_TOKEN = "someone-elses-token";
    try {
      setKaggleCreds("thai", LEGACY);
      const env = kaggleEnv();
      expect(env.KAGGLE_API_TOKEN).toBeUndefined();
      expect(env.KAGGLE_CONFIG_DIR).toMatch(/cache[\\/]kaggle-config$/);
    } finally {
      if (before === undefined) delete process.env.KAGGLE_API_TOKEN; else process.env.KAGGLE_API_TOKEN = before;
    }
  });

  it("redacts the key from log lines", () => {
    setKaggleCreds("thai", LEGACY);
    expect(redactKaggle(`401 for key ${LEGACY}`)).toBe("401 for key •••");
  });

  it("rejects a username with spaces or symbols outside kaggle's allowed set", () => {
    expect(() => setKaggleCreds("thai hoai", "abc123def456")).toThrow();
  });

  it("rejects a key that is too short or contains whitespace", () => {
    expect(() => setKaggleCreds("thai", "short")).toThrow();
    expect(() => setKaggleCreds("thai", "abc def ghi jkl")).toThrow();
  });

  it("clears back to no credentials", () => {
    setKaggleCreds("thai", LEGACY);
    clearKaggleCreds();
    expect(hasKaggleCreds()).toBe(false);
  });
});
