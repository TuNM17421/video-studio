import { afterEach, describe, expect, it } from "vitest";
import { clearKaggleCreds, hasKaggleCreds, kaggleEnv, kaggleUsername, parseKaggleJson, setKaggleCreds } from "./kaggle-creds";

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

  it("stays empty until credentials are set, then reports them without echoing the key", () => {
    expect(hasKaggleCreds()).toBe(false);
    setKaggleCreds("thai", "abc123def456");
    expect(hasKaggleCreds()).toBe(true);
    expect(kaggleUsername()).toBe("thai");
    const env = kaggleEnv();
    expect(env.KAGGLE_USERNAME).toBe("thai");
    expect(env.KAGGLE_KEY).toBe("abc123def456");
  });

  it("rejects a username with spaces or symbols outside kaggle's allowed set", () => {
    expect(() => setKaggleCreds("thai hoai", "abc123def456")).toThrow();
  });

  it("rejects a key that is too short or contains whitespace", () => {
    expect(() => setKaggleCreds("thai", "short")).toThrow();
    expect(() => setKaggleCreds("thai", "abc def ghi jkl")).toThrow();
  });

  it("clears back to no credentials", () => {
    setKaggleCreds("thai", "abc123def456");
    clearKaggleCreds();
    expect(hasKaggleCreds()).toBe(false);
  });
});
