# Agent 03 — Verify live ChatGPT sign-in

**What to verify** Connect an eligible ChatGPT account from Orbit Settings, complete a real Agent turn, and confirm the OpenAI API key option remains selectable.

**Status** Sign-in and live chat verified. Scoped reads and live API-key use remain open.

On November 19, 2026, the owner completed ChatGPT sign-in. From Home, the Agent returned the requested “Orbit connection verified.” reply using that connection. The OAuth callback, token renewal, and streamed response also have fixture coverage.

## Acceptance criteria

- [x] Browser sign-in returns to Orbit with a connected state and an available model.
- [ ] A scoped Agent request completes using the connected ChatGPT account. Verify a current-tab read and workspace-level query.
- [ ] When the owner selects OpenAI API key, the Agent uses that connection. Expired or declined ChatGPT authorization produces a clear recovery message.

[Agent connection design](../../../docs/adr/0010-agent-led-publishing.md) · [Local setup](../../../README.md)
