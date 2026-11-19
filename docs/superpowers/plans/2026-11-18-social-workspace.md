# Social Workspace implementation plan

The glossary and decision records define the accepted behavior. Build a standalone Electron app with site sessions per saved account, a persistent local workspace, and an embedded Codex App Server client. An authorized Postiz API connection is the initial publisher. The calendar provides a prepared draft for the site editor when a destination has no publishing connection.

- [ ] Test and implement local persistence, Bangkok scheduling, independent destination outcomes, and overdue recovery in `src/workspace.cjs`. Exercise failures and unknown publishing outcomes through `test/workspace.test.cjs`.
- [ ] Implement account tabs, the account picker, local media, calendar, and analytics in `src/main.cjs` and `src/ui/`. Verify through a native Electron smoke run using a separate data folder.
- [ ] Implement the documented Postiz API calls in `src/publisher.cjs` and the Codex App Server connection in `src/assistant.cjs`. Test scheduling and reporting against controlled responses. Keep provider credentials and browser sessions in the local app.
- [ ] Verify fresh and existing baselines, missed posts, session separation, and the reconnect timing. Record which live account actions still need owner credentials.
