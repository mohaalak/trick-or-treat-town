// A pixelfx effect played into its own little canvas, so the game can draw it anywhere (and depth-sort it).

import { createFrame, clearFrame, createFx, composite } from "../vendor/pixelfx/core/index.js";

export class FxSprite {
  /** pad widens the canvas past meta.size, for effects (like long text) that spill out of their box. */
  constructor(mod, opts = {}, pad = 0) {
    const [w, h] = mod.meta.size, [ox, oy] = mod.meta.origin;
    this.w = w + pad * 2;
    this.h = h + pad * 2;
    this.ox = ox + pad;
    this.oy = oy + pad;
    this.frame = createFrame(this.w, this.h, -this.ox, -this.oy);
    this.img = new ImageData(this.w, this.h);
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.ctx = this.canvas.getContext("2d");
    this.fx = createFx(mod, { x: 0, y: 0, ...opts });
    this.dirty = true;
  }
  update(dt) {
    this.fx.update(dt);
    this.dirty = true;
  }
  render() {
    if (!this.dirty) return;
    clearFrame(this.frame);
    this.fx.draw(this.frame);
    composite(this.frame, this.img.data, null);
    this.ctx.putImageData(this.img, 0, 0);
    this.dirty = false;
  }
  /** Draws with the effect's origin at (x, y). */
  draw(ctx, x, y, alpha = 1) {
    this.render();
    if (alpha !== 1) ctx.globalAlpha = alpha;
    ctx.drawImage(this.canvas, Math.round(x - this.ox), Math.round(y - this.oy));
    if (alpha !== 1) ctx.globalAlpha = 1;
  }
  stop() {
    this.fx.stop();
  }
  done() {
    return this.fx.done();
  }
}
