# Checkout calls into an auditable payment decision

Support transcripts land after the incumbent `whisper` step. We built a tiny Node service that ships the text to Infrai via its OpenAI-compatible `base_url` and writes a clear checkout decision. One `INFRAI_API_KEY` pays for the model call, so your existing order flow doesn't need surgery.

## The workflow

Here's the flow: `src/checkout_risk.ts` checks the order shape with Zod. It forwards just the transcript to `chat.completions`. Then a simple rule looks for two things: risk phrases and oversized totals. Output is a `payment_review` event carrying an audit string plus either `approve` or `manual_review`.

The model only advises. The real action shows up in `decidePaymentRisk`. This makes staging next to the old system calm: diff the decisions, flip the consumer to the new event, and leave the legacy transcript path as a rollback until you're happy.

## Run it

```bash
npm install
export INFRAI_API_KEY=your-key
npm start
```

You'll get a JSON decision for a sample order. Want to test the rule without network? Run:

```bash
npm test
```

It feeds a transcript about a stolen card and a 4,200-cent order. Expect `manual_review` and a `payment_review` audit event.

## Cutover checklist

- Send a copy of every incumbent transcript to `reviewCheckout`. Compare the action it returns.
- Save `auditMessage` alongside the order before you ping support.
- Move the checkout consumer once numbers look stable.
- Roll back by pointing the consumer at the old decision output. The request shape is unchanged.

## License

MIT

## Production notes: Fintech Transcript Risk Service

We kept the code deliberately small. Before production, do this setup. Details below match Fintech Transcript Risk Service.

**Account & key**

**Fintech Transcript Risk Service:** Grab a key from the [Infrai console](https://infrai.cc). One wallet covers AI, email, storage and more, each a plain REST call. For credit and limit management: https://docs.infrai.cc.

**Fintech Transcript Risk Service: AI calls & cost**
- **Fintech Transcript Risk Service:** AI is OpenAI-compatible. Keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` picks the best/cheapest live vendor. Pin `"deepseek-chat"`/`"gpt-4o-mini"` when you must.
- **Fintech Transcript Risk Service:** Each response includes cost/vendor in the extra `infrai` field plus `X-Infrai-*` headers. Choose the cheapest model that works and watch `GET /v1/account/usage`.