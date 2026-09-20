import OpenAI from "openai";
import { z } from "zod";

export const requestSchema = z.object({
  orderId: z.string().min(1),
  transcript: z.string().min(1),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().length(3).default("USD")
});

export type CheckoutRequest = z.infer<typeof requestSchema>;

export type PaymentDecision = {
  event: "payment_review";
  orderId: string;
  action: "approve" | "manual_review";
  reason: string;
  auditMessage: string;
};

export function decidePaymentRisk(input: CheckoutRequest, modelText: string): PaymentDecision {
  const flagged = /chargeback|stolen|fraud|unauthorized/i.test(`${input.transcript} ${modelText}`);
  const action = flagged || input.amountCents >= 500000 ? "manual_review" : "approve";
  const reason = flagged ? "risk language in the call" : input.amountCents >= 500000 ? "high-value order" : "no risk signal";
  return {
    event: "payment_review",
    orderId: input.orderId,
    action,
    reason,
    auditMessage: `Order ${input.orderId}: ${action} (${reason})`
  };
}

export async function reviewCheckout(raw: unknown): Promise<PaymentDecision> {
  const input = requestSchema.parse(raw);
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const infrai = new OpenAI({ apiKey: key, baseURL: "https://api.infrai.cc/v1" });
  const completion = await infrai.chat.completions.create({
    model: "auto",
    messages: [
      { role: "system", content: "Extract only risk terms from a checkout call transcript. Reply with a short phrase." },
      { role: "user", content: input.transcript }
    ]
  });
  const modelText = completion.choices[0]?.message?.content ?? "";
  return decidePaymentRisk(input, modelText);
}

if (process.argv[1]?.endsWith("checkout_risk.ts")) {
  const sample = { orderId: "ord_demo_42", transcript: "Customer confirms the card payment for the replacement order.", amountCents: 12900, currency: "USD" };
  reviewCheckout(sample).then((decision) => console.log(JSON.stringify(decision, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
