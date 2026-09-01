import { describe, expect, it, vi } from "vitest";
import { sendInvitationEmail } from "@/lib/email/sendInvitationEmail";

describe("sendInvitationEmail (mock hasta tener dominio propio verificado en Resend)", () => {
  it("loguea el destinatario y el link en vez de enviar un correo real", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await sendInvitationEmail("ana@tccars.cl", "http://tccars.localhost:3000/invitacion/tok");

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("ana@tccars.cl"),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("http://tccars.localhost:3000/invitacion/tok"),
    );

    logSpy.mockRestore();
  });
});
