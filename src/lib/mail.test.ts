import { describe, expect, it, vi } from "vitest";
import { sendWithResend } from "./mail";

const mail = { to: "ada@example.com", subject: "Conferma", text: "Apri https://lumora.example/verifica?token=segreto" };

describe("sendWithResend", () => {
  it("posts the email to Resend with the API key", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));

    await sendWithResend(mail, "re_test_1234567890", "Lumora <noreply@lumora.example>", fetchImpl);

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test_1234567890");
    expect(JSON.parse(init.body as string)).toEqual({
      from: "Lumora <noreply@lumora.example>",
      to: ["ada@example.com"],
      subject: "Conferma",
      text: mail.text,
    });
  });

  it("fails with the status only, never the message (it contains single-use links)", async () => {
    const fetchImpl = vi.fn(async () => new Response(mail.text, { status: 422 }));

    const error = await sendWithResend(mail, "re_test_1234567890", "a@b.c", fetchImpl).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Resend responded 422");
    expect((error as Error).message).not.toContain("segreto");
  });
});
