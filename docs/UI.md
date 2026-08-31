# UI layout checklist

Shared primitives live in `components/ui/screen-layout.tsx`. Reference implementations: `components/availability/availability-rules-screen.tsx`, `components/settings/settings-hub-content.tsx`.

## When to use what

| Pattern | Component | Notes |
|---------|-----------|-------|
| Screen chrome | `ScreenShell` | Back (optional), 28pt title, `headerRight` slot |
| Scroll body | `ScreenScroll` | `Layout.screenPaddingX`, safe bottom inset |
| Intro / helper copy | `ScreenFootnote` | 14pt secondary text above content |
| Static section title | `SectionLabel` | Uppercase 12pt label — no action link |
| Actionable section title | `SectionHeader` | Title + “See all” link |
| Inset list card | `GroupedList` | `surface` bg, `Radius.lg`, hairline border, elevation |
| List row | `GroupedRow` | 44pt min, 36×36 icon well, trailing slot |
| Secondary CTA | `OutlineButton` | Full-width bordered tint button |
| Form modal (iOS) | `FormSheet` | pageSheet with Cancel \| Title \| Save |
| Form fields in sheet | `GroupedFormSection` | Bordered field group inside sheet |
| Empty list | `EmptyState` | Inside `GroupedList` |
| Theme on screens | `useScreenTheme()` | Prefer over mixing `Colors[…]` + `useAppTheme()` |

Forest green (`tint`) is brand chrome — tabs, icons, OutlineButton, in-app FilledButton. Terracotta (`accent`) is paywall / upgrade CTAs only. Do not use green for small body text.

## Spacing & typography

- Horizontal inset: `Layout.screenPaddingX`
- Section gap: `Layout.sectionGap`
- Row min height: `Layout.touchMin` (44pt)
- Title: 28pt bold in shell header
- Section labels: uppercase, letter-spacing 0.6

## Grouped list vs SurfaceCard

- **GroupedList** — settings-style rows, availability rules, contacts, guests, requests
- **SurfaceCard** — standalone dashboard tiles or marketing blocks with heavier radius (28)

## Migration verification

After changing a screen:

- [ ] Uses `useScreenTheme()` (not `Colors[colorScheme]` in the same file)
- [ ] Header via `ScreenShell` (no manual `paddingTop: insets.top + 12`)
- [ ] Lists in `GroupedList` + `GroupedRow` (not individual bordered boxes)
- [ ] Static sections use `SectionLabel`
- [ ] Secondary actions use `OutlineButton`
- [ ] Light + dark mode spot-check

## Grep for leftovers

```bash
rg "paddingTop: insets\.top \+ 12" app/
rg "styles\.(header|back|title)" app/ --glob "*.tsx"
```

False positives: `styles.headerActions`, `styles.headerText` (custom title nodes inside `ScreenShell`).
