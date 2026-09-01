# UI layout checklist

Shared primitives live in `components/ui/screen-layout.tsx`. Reference implementations: `components/availability/availability-rules-screen.tsx`, `components/settings/settings-hub-content.tsx`.

The look is **editorial hospitality**, not iOS Settings. Light canvas is cool bone `#F2F1ED` with ink type. Brand chrome is espresso. Display type is for **photo heroes only**. List screens use a left-aligned 28pt title.

## When to use what

| Pattern | Component | Notes |
|---------|-----------|-------|
| Screen chrome | `ScreenShell` | Back (44pt, optional), left 28pt title. No empty well when `showBack={false}` |
| Photo overlay | `PhotoHero` | Full-bleed cover + ink scrim; cream text only on the scrim; `type="display"` here |
| Scroll body | `ScreenScroll` | `Layout.screenPaddingX`, safe bottom inset |
| Intro / helper copy | `ScreenFootnote` | 14pt secondary text above content |
| Static section title | `SectionLabel` | Uppercase 13pt medium — editorial, not a 12pt form stamp |
| Actionable section title | `SectionHeader` | Title + “See all” link |
| Inset list | `GroupedList` | Hairline only — no elevated paper vs canvas |
| List row | `GroupedRow` | 44pt min; tappable rows show a chevron unless `trailing` is set |
| Primary CTA | `FilledButton` | Espresso fill; `tone="accent"` (terracotta) for hero / upgrade; `size="hero"` on Home only |
| Secondary CTA | `OutlineButton` | Full-width bordered espresso |
| Form modal (iOS) | `FormSheet` | pageSheet with Cancel \| Title \| Save |
| Form fields in sheet | `GroupedFormSection` | Bordered field group inside sheet |
| Empty list | `EmptyState` | Inside `GroupedList` |
| Theme on screens | `useScreenTheme()` | Prefer over mixing `Colors[…]` + `useAppTheme()` |

Espresso (`tint`) is brand chrome — selected tab, icons, OutlineButton, in-app FilledButton. Warm olive is calendar available / my stay / success. Terracotta (`accent`) is the living accent — Home hero CTA, hub primary, paywall. Do not use chrome for small body text.

## Hero vs grouped row

Use a **hero** when the screen has one next event or one property: Home, property list cards, property hub header. One photo, display type, **one** action (photo and button share the same destination).

Use a **grouped row** for everything else: settings, contacts, documents, FAQ, the remaining hub destinations after the two primary actions. Do not turn a destination screen into a grid of equal-weight tiles.

## Spacing & typography

- Horizontal inset: `Layout.screenPaddingX`
- Section gap: `Layout.sectionGap`
- Row min height: `Layout.touchMin` (44pt)
- List title: 28pt left in shell header
- Display 36pt: photo overlays only
- Body 16pt; captions and stat labels 14pt sentence case
- Tab labels: 12pt
- Section labels: uppercase 13pt, letter-spacing 1.4
- Cards / photo frames: `Radius.lg` (22); buttons stay `Radius.md` (14)

## Grouped list vs SurfaceCard

- **GroupedList** — settings rows, availability rules, contacts, guests, requests. Same field as the canvas; hairline separators. Tappable rows get a chevron.
- **SurfaceCard** — standalone blocks that still need a border (conversion). Prefer `outline` over `elevated`.

## Migration verification

After changing a screen:

- [ ] Uses `useScreenTheme()` (not `Colors[colorScheme]` in the same file)
- [ ] Header via `ScreenShell` (no manual `paddingTop: insets.top + 12`)
- [ ] Lists in `GroupedList` + `GroupedRow` (not individual bordered boxes)
- [ ] Static sections use `SectionLabel`
- [ ] Secondary actions use `OutlineButton`
- [ ] Overlay text on photos sits on the ink scrim
- [ ] Light + dark mode spot-check

## Grep for leftovers

```bash
rg "paddingTop: insets\.top \+ 12" app/
rg "styles\.(header|back|title)" app/ --glob "*.tsx"
```

False positives: `styles.headerActions`, `styles.headerText` (custom title nodes inside `ScreenShell`).
