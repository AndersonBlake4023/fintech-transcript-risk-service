import { strict as assert } from "node:assert";
import { decidePaymentRisk, requestSchema } from "./checkout_risk.ts";

const request = requestSchema.parse({ orderId: "ord_7", transcript: "Caller reports a stolen card.", amountCents: 4200 });
const decision = decidePaymentRisk(request, "stolen card");
assert.equal(decision.action, "manual_review");
assert.equal(decision.event, "payment_review");
assert.match(decision.auditMessage, /ord_7/);
console.log("risk decision test passed");
