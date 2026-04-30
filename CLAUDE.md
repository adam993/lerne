## Always follow these rules:

- Yarn is the package manager and script runner. Use `yarn dev`, `yarn typecheck`, `yarn build` for verifying changes.
- Tailwind 4: theme is declared inside `src/styles.css` with `@theme inline { ... }` — there is no separate `tailwind.config.*`. Use up-to-date Tailwind 4 conventions.
- Use hex colors for theme tokens (not oklch) so they round-trip cleanly through the design tools.
- No graceful fallbacks. Throw early — caught errors are easier than silent wrong behaviour.
- Test everything after a change: typecheck, run the app, click through the affected screens.
- Document non-obvious changes in `local-claude-files/`. That directory is gitignored by convention except in this project — it is committed here so future agents have context.

## Architecture in one paragraph

`Lerne` is a static, fully-offline German↔English vocab quiz. Three modes
(words / phrases / sentences) each draw from a bundled JSON corpus. The
quiz engine picks one German prompt, plus 4 random English distractors
from the same mode. Wrong answers are re-queued to reappear after 3 new
prompts. Per-mode progress (correct count, wrong count, deck position,
re-queue) is persisted via `@capacitor/preferences` (which transparently
falls back to `localStorage` in a browser). No server, no auth, no
notifications — those layers were stripped from the mantabe boilerplate
this project was forked from.
