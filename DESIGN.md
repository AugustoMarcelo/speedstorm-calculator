---
name: Disney Speedstorm Racer Shard Calculator
description: A focused racing dashboard for planning a Racer's next Star.
colors:
  navy-bg: "#091724"
  navy-panel: "#102233"
  navy-result: "#152c40"
  navy-selected: "#173d4b"
  cyan-racing: "#65e3ef"
  star-yellow: "#ffda6a"
  text-light: "#edf4fa"
  blue-muted: "#abc0d1"
  blue-line: "#30485c"
  error-coral: "#ffb6b6"
typography:
  display:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(36px, 4.4vw, 54px)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.015em"
  result:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "96px"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Barlow, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  label:
    fontFamily: "Barlow, sans-serif"
    fontSize: "15px"
    fontWeight: 600
rounded:
  compact: "5px"
  field: "6px"
  notice: "8px"
  panel: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-update:
    backgroundColor: "{colors.navy-bg}"
    textColor: "{colors.text-light}"
    rounded: "{rounded.compact}"
    padding: "10px 14px"
    height: "44px"
  balance-field:
    backgroundColor: "{colors.navy-bg}"
    textColor: "{colors.text-light}"
    rounded: "{rounded.field}"
    height: "52px"
  result-panel:
    backgroundColor: "{colors.navy-result}"
    textColor: "{colors.text-light}"
    padding: "31px 34px 23px"
---

# Design System: Disney Speedstorm Racer Shard Calculator

## Overview

**Creative North Star: "Racing crew upgrade console"**

A compact, practical dashboard for checking a Racer’s next Star upgrade. Deep navy supports a focused, low-glare reading scene. Barlow Condensed carries the display and large numeric result; Barlow keeps controls, help, and explanations readable. Cyan identifies selection and focus. Yellow identifies Stars and outstanding Racer Shards.

Racing cues live in small geometric marks, the faceted shard icon, and a checkered finish marker. The calculator and its result occupy the first viewport. Explanatory content follows below.

**Key Characteristics:**
- Layered navy-blue surfaces with fine blue outlines.
- Consistent distinction between cyan interactions and yellow Stars or shard counts.
- Original local SVG geometry; no remote images or image-like decoration.

## Colors

A dark navy and blue base carries two functional accents.

### Primary
- **Racing Cyan** (`{colors.cyan-racing}`): selection, keyboard focus, and interactive icons.

### Secondary
- **Star Yellow** (`{colors.star-yellow}`): Stars and Racer Shards still needed.

### Tertiary
- **Error Coral** (`{colors.error-coral}`): invalid inventory values and their nearby message.

### Neutral
- **Deep Navy** (`{colors.navy-bg}`): page background and input surfaces.
- **Panel Navy** (`{colors.navy-panel}`): main calculator and form surface.
- **Result Blue** (`{colors.navy-result}`): result area, separated by tone.
- **Selected Blue** (`{colors.navy-selected}`): selected radio option.
- **Outline Blue** (`{colors.blue-line}`): control borders and dividers.
- **Light Text** (`{colors.text-light}`): primary copy and entered values.
- **Soft Blue Text** (`{colors.blue-muted}`): hints, captions, and supporting values.

**The Two-Accent Rule.** Cyan marks selection and interaction. Yellow marks Stars and Racer Shards still needed.

## Typography

**Display Font:** Barlow Condensed (sans-serif)
**Body Font:** Barlow (sans-serif)

**Character:** Condensed headings and numbers keep the dashboard compact. Barlow makes field labels and the terminology-rich Star Fragment explanation easy to scan.

### Hierarchy
- **Display** (600, `clamp(36px, 4.4vw, 54px)`, 1.05): page heading.
- **Result** (600, `96px` desktop and `88px` mobile, 1.08): remaining Racer Shards.
- **Title** (600, `25px`): section headings.
- **Body** (400, `16px` base; smaller support copy as implemented): page copy and explanation.
- **Label** (600, `15px`): field labels and legends.

## Layout

A centered content column up to `1120px` uses `40px` outer margins, reduced to `24px` below `900px` and `16px` below `680px`. At desktop sizes, the form and result share a two-column calculator, with slightly more space for the form. Below `680px`, they stack and the explanation becomes one column. At widths below `360px`, the form uses `14px` inner padding and tighter choice gaps. Group spacing follows an `8 / 12 / 16 / 24px` rhythm.

## Elevation & Depth

Main panels use flat surfaces with thin outlines. The result surface is lighter than the form. Only the fixed version update notice casts a shadow, lifting it above page content.

### Shadow Vocabulary
- **Update Notice** (`0 8px 32px #020b1480`): floats above content when an update is ready.

## Shapes

Inputs and radio choices use small `6px` corners. The calculator uses a `14px` radius; the update notice uses `8px`. Fine borders and separators organize the panels. Speed bars, shard facets, and checkered finish marks supply minimal racing geometry.

## Components

### Star and Star Fragment choices

Native radio inputs use clickable labels, arrow-key operation, at least `46px` hit targets, and a cyan focus ring. Separate Star Fragment choices describe current and target progress toward the next Star; at six Stars the corresponding controls are disabled. Target summaries include fragments when selected and wrap to fit narrow screens.

### Currency inventory fields

Separate horizontal fields pair shard and coin icons and numeric values with visible “Racer Shards” and “Tune Coins” units. Each uses a `52px` minimum height. Focus outlines the full control in cyan; invalid input uses the error color and an adjacent correction message.

### Calculator and result panels

The form and summary sit in one rounded outlined container. A divider separates the desktop columns; on mobile it runs between stacked panels. The summary leads with **What you can unlock now** and **With both currencies** in 27px cyan Barlow Condensed. A six-star track shows five fragment segments toward the next star beneath stars 1–5; the sixth star has no fragments. Before the first star, a separate initial row shows its five fragments. Numbers are centered inside the same SVG coordinate system as the stars. Fragment states are: solid yellow for unlocked fragments, cyan with an open bottom for available upgrades, dashed cyan for shard-only potential, and empty outlines for locked fragments. Star numbers, a visible legend, and accessible per-star descriptions accompany the graphic. A yellow outline marks the selected target and its exact fragment. Each per-star description identifies progress toward the following star.

**With your Racer Shards** follows the track, with an 18px semibold descriptive progress value and the Tune Coin shortage beneath it. Both inventory destinations ignore the selected target and future rewards. **Resources for your target** pairs the existing currency icons with independent cyan meters, available/required amounts, and explicit Enough / still needed labels. Invalid balances hide the affected meter and show a correction, preserving independent currency results.

**Upgrade costs and next steps** is a native disclosure, collapsed initially, containing the detailed shortage, a compact accounting table with currency-icon columns, Upgrade breakdown, and Next upgrade comparison. Breakdown and next-upgrade values pair numeric costs with currency icons. Event/MPL projections use two numeric columns, and the minimum MPL is a short destination with its earned/needed amounts. Model assumptions and sources are in a separate native disclosure. **Rewards still to collect** follows separately when planned event rewards contribute or MPL planning is enabled; it identifies all results as projections and shows event contributions and remaining shortages separately from current affordability. Labels and values wrap within the result column.

The visible note reads: “Inventory only · independent of your target.” A separate polite, atomic status announces all three contextual outputs and correction messages, updating only when its text changes. Invalid coins retain shard potential; invalid shards replace all utility outputs with the shard correction. Adjacent inventory field errors remain visible.

### Events editor and list

A separate Events section follows the calculator, keeping its form outside the calculator form. It inherits the navy surfaces, Barlow type, thin outlines, cyan focus rings, and 44px minimum button targets. Three labeled native inputs capture name, remaining Racer Shards, and inclusive local end date. Fields form three columns on desktop and stack below 680px. Each saved row shows its name, a shard icon and numeric remaining reward, end date, and named Edit/Remove buttons; long names wrap. Edit reuses the form with Save event and Cancel edit actions. Empty state, adjacent field-specific errors with `aria-describedby`/`aria-invalid`, and polite status messages cover empty, invalid, saved-in-memory, and expired states. User text is rendered as text content.

Help in a collapsed native disclosure explains current-Racer scope, manual reward reconciliation, local date semantics, and Reset retention. MPL input notes are also expandable. How it works uses three short numbered steps. A visible storage warning says changes cannot be saved and may be lost on reload. The summary lists planned event shards separately from inventory and labels the result as projected whenever rewards still to collect contribute; the live result announcement carries the same qualification.

### Expandable progression table

A native disclosure reveals Season 22 totals per full Star in both currencies. Each row covers all five Star Fragments for that Star upgrade. Its plus icon rotates on open. Thin row rules and tabular numerals support quick comparison.

### Update notice and links

The fixed update notice uses a light surface and dark text; its dark Update button has a `44px` minimum height. Navigation and source links use local SVGs, cyan hover color, and visible focus treatment.

## Do's and Don'ts

### Do:
- **Do** reserve cyan for focus and selection, and yellow for Stars and the prominent Racer Shards result.
- **Do** call inventory currencies **Racer Shards** and **Tune Coins**, and unlocked progress **Star Fragments**.
- **Do** retain Barlow Condensed for display numbers and Barlow for body and controls.
- **Do** keep native controls and a visible keyboard focus ring.
- **Do** stack the form and summary below `680px`.

### Don't:
- **Don't** use yellow for the selected state or cyan for the missing-shards result.
- **Don't** rely on color alone for selection, focus, errors, or disabled choices.
- **Don't** add shadows to the main panels or substitute Unicode text for icons.
