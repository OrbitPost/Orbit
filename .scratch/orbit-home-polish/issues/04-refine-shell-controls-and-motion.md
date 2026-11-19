# 04 — Make the shell and controls feel immediate

**What to build** Use the lightly frosted side panels and matte center with responsive, accessible controls and a restrained startup reveal.

**Blocked by** None

**Status** complete

- [x] The left and Agent panels have one subtle frosted surface each. The embedded site stays crisp and Home has one faint orbital arc.
- [x] The Agent starts closed. Pointer toggles reverse smoothly on repeated input and keyboard toggles respond immediately.
- [x] Agent close returns focus to the toggle. Closed contents leave the keyboard order. Light and dark controls show visible focus.
- [x] The launch mark rises and lifts out as specified. Reduced motion skips the reveal and applies the panel layout immediately.

Verified regular and reduced motion in Electron, including in-flight reversals for both panels and focus return from Agent.

[Parent spec](../../../SPEC-home-polish.md)
