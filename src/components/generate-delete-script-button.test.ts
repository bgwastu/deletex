import { describe, expect, it } from "vitest";
import { generate, type ScriptMessages } from "./generate-delete-script-button";

const messages: ScriptMessages = {
  confirm: "Delete one?",
  wrongPage: "Wrong page",
  noCsrf: "No session",
  starting: "Starting",
  deleted: "Deleted {id}, {count}",
  failed: "Failed {id}: {reason}",
  rateLimited: "Waiting",
  stoppedAuth: "Sign in",
  complete: "Done {success}/{failed}",
  failures: "Failures",
  unavailable: "Unavailable",
};

describe("deletion script generation", () => {
  it("embeds targets safely and includes response validation and recovery", () => {
    const script = generate(
      [{ id: "123", type: "retweet", sourceTweetId: "456" }],
      messages,
    );
    expect(script).toContain('"sourceTweetId":"456"');
    expect(script).toContain("DeleteRetweet");
    expect(script).toContain("response.status === 429");
    expect(script).toContain("body?.data?.delete_tweet");
    expect(script).toContain("CHECKPOINT_KEY");
    expect(script).not.toContain("XMLHttpRequest.prototype");
    expect(() => new Function(script)).not.toThrow();
  });

  it("keeps translated text and IDs as data", () => {
    const script = generate(
      [{ id: '1"; alert("unsafe")', type: "tweet" }],
      { ...messages, confirm: 'Delete "${location.href}"?\u2028' },
    );
    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain('1\\\"; alert(\\\"unsafe\\\")');
  });
});
