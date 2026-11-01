<img src="assets/icon.svg" width="64" height="64" alt="">

# Trick or Treat Town

An isometric Halloween browser game. A little witch runs door to door collecting candy before the clock runs out.

- **Treat houses** have pumpkins, warm orange windows and a candle on the porch. Stand at the door to knock for 2–4 candies. One house gives full-size bars (8).
- **Trick houses** look decorated but have green windows and a green ghost flame. Knocking scares a flaming skull out, you drop 3 candies and get stunned.
- **Dark houses** have nobody home.
- **Ghosts** roam the streets and chase you when you get close. **Bats** swoop across. A hit makes you drop candy, which you can pick back up before it fades.
- **Super lollipop** shows up now and then (pink dot on the minimap). Grab it and for 8 seconds the ghosts turn blue and run away. Catch one for +2 candies. Bats can't hurt you either.
- **Sticky webs** on the road slow you down.
- Loose candy on the streets is worth 1 each. You have 90 seconds. Your best score is saved.

Controls: arrow keys or WASD (up + right walks along a road). On touch screens, drag anywhere.

On phones the game goes full screen when you start. Use "Add to Home Screen" to install it as a full-screen app (it has a web app manifest).

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static build in dist/
```

## Credits

Effects (ghosts, bats, candles, ghost flames, flaming skull, pops, countdown, confetti, fog) come from
[pixelfx](https://github.com/patch-gg/pixelfx), vendored in `vendor/pixelfx` under its MIT license (see
`vendor/pixelfx/LICENSE` and `NOTICE.md`). Houses, the kid, pumpkins, props and the town are drawn in code in `src/sprites.js`.
