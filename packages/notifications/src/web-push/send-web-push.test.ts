import { describe, it, expect } from "vitest";
import { generateVAPIDKeys } from "web-push";
import { sendWebPush } from "./send-web-push.js";

describe("sendWebPush", () => {
  it("intenta un envio real via HTTP y rechaza limpiamente contra un endpoint invalido", async () => {
    const vapidKeys = generateVAPIDKeys();

    await expect(
      sendWebPush(
        {
          endpoint: "https://fcm.googleapis.com/fcm/send/este-endpoint-no-existe-en-absoluto-123",
          keys: { p256dh: "invalid-key-material", auth: "invalid-auth" },
        },
        { title: "Test", body: "Test body" },
        { publicKey: vapidKeys.publicKey, privateKey: vapidKeys.privateKey, subject: "mailto:test@loyaltycr.com" }
      )
    ).rejects.toThrow();
  });
});
