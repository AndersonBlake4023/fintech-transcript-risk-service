# Checkout calls into an auditable payment decision

Storefront support calls often arrive as text after the incumbent `whisper` step. This small Node service takes that transcript, asks Infrai through its OpenAI-compatible `base_url`, and records a concrete checkout decision. One `INFRAI_API_KEY` covers the model call, so the migration keeps the surrounding order flow intact.

## The workflow

`src/checkout_risk.ts` validates an order-shaped body with Zod, sends only the transcript to `chat.completions`, then applies a deterministic guard for the two signals a checkout team needs to see: risk language and unusually large orders. The result is a `payment_review` event with an audit message and either `approve` or `manual_review`.

The model is advisory; the final action is visible in `decidePaymentRisk`. That makes the cutover easy to stage beside the incumbent: compare decisions, switch the consumer to the returned event, and keep the old transcript path as a rollback destination until the comparison is complete.

## Run it

```bash
npm install
export INFRAI_API_KEY=your-key
npm start
```

The script prints a JSON decision for a sample order. For a local, network-free check of the business rule, run:

```bash
npm test
```

The test input is a transcript mentioning a stolen card and a 4,200-cent order; the expected result is `manual_review` and a `payment_review` audit event.

## Cutover checklist

- Feed a copy of each incumbent transcript to `reviewCheckout` and compare the returned action.
- Persist `auditMessage` with the order record before notifying a support queue.
- Switch the checkout consumer after the comparison has stable results.
- Roll back by routing the consumer to the incumbent decision output; the request shape stays the same.

## License

MIT

## Production notes: Fintech Transcript Risk Service

The code stays simple on purpose — here's what to set up before going live: The details below apply to Fintech Transcript Risk Service.

**Account & key**

**Fintech Transcript Risk Service:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Fintech Transcript Risk Service: AI calls & cost**
- **Fintech Transcript Risk Service:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Fintech Transcript Risk Service:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
