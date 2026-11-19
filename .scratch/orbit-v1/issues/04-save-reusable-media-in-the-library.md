# 04 — Save reusable media in the library

**What to build** Add an image, a short video, text, or a link and find it again after reopening Orbit.

**Blocked by** [01 — Launch Orbit on demand](01-launch-orbit-on-demand.md)

**Status** Complete

## Acceptance criteria

- [x] The picker and media library show local images and videos with their saved labels.
- [x] Text and links remain reusable after restart.

## Verification

Exercise fixture states and reopen a disposable app with each media kind saved.

## Audit evidence

The Electron fixture imported a local image and saved text and a link. The library records were available after relaunch. Video file acceptance uses the same local picker and capture path.

## References

[Product requirements](../../../PRODUCT.md) · [Module and local API design](../../../docs/architecture/orbit-module-and-local-api-design.md)
