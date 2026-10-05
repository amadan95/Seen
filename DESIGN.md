---
name: Seen — Festival Programme
description: A plum and cream editorial film journal for iPhone.
colors:
  background: '#20191E'
  surface: '#2C242A'
  elevated: '#3A2B34'
  border: '#4B3E48'
  text: '#F4ECE2'
  muted: '#CABFBE'
  accent: '#E6CFB1'
  success: '#B4D6BD'
  danger: '#F1ABA5'
typography:
  display:
    fontFamily: 'Georgia'
    fontSize: '34pt'
    fontWeight: 400
    letterSpacing: '-0.7pt'
  headline:
    fontFamily: 'Georgia'
    fontSize: '22pt'
    fontWeight: 400
  title:
    fontFamily: 'Georgia'
    fontSize: '19pt'
    fontWeight: 400
    lineHeight: '25pt'
  body:
    fontFamily: 'System'
    fontSize: '17pt'
    lineHeight: '25pt'
  label:
    fontFamily: 'System'
    fontSize: '16pt'
    fontWeight: 600
  caption:
    fontFamily: 'System'
    fontSize: '13pt'
    lineHeight: '19pt'
  eyebrow:
    fontFamily: 'System'
    fontSize: '12pt'
    letterSpacing: '1.2pt'
rounded:
  poster: '3pt'
  badge: '6pt'
  segment: '9pt'
  control: '10pt'
  inset: '12pt'
  chip: '18pt'
spacing:
  inline: '8pt'
  section-gap: '12pt'
  content-gap: '16pt'
  screen: '20pt'
  section-top: '24pt'
  bottom-clearance: '100pt'
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.background}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '12pt 18pt'
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '12pt 18pt'
  input:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.control}'
    padding: '14pt'
  chip:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.chip}'
    padding: '10pt 14pt'
  chip-selected:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.background}'
    rounded: '{rounded.chip}'
    padding: '10pt 14pt'
  segment-selected:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.background}'
    rounded: '{rounded.segment}'
    padding: '9pt'
  inset:
    backgroundColor: '{colors.surface}'
    rounded: '{rounded.inset}'
    padding: '16pt'
  poster:
    backgroundColor: '{colors.surface}'
    rounded: '{rounded.poster}'
---

# Design System: Seen

## Overview

**Creative North Star: "Festival Programme"**

Festival Programme is a private film journal: plum pages, warm cream typography, Georgia headings and finely ruled title rows. Poster artwork supplies the imagery; restrained surfaces and native controls keep logging and ranking comfortable on an iPhone.

The user-selected B world applies throughout. Home retains the approved A composition—a cropped feature poster, Continue ranking inset and poster rail—translated into B’s palette and typography. Other screens read as an editorial programme. This documents the local preview with its configured real TMDB bridge; authentication, remote services and release verification remain separate gates.

**Key Characteristics:**

- Plum tonal layers and cream editorial type.
- Georgia headings and title rows; system body text and controls.
- Fine rules, nearly square posters and restrained native interaction.
- Honest local-preview, missing-data and unplaced states.

## Colors

A warm plum neutral family supports cream text and a pale, warm action tint. The frontmatter is the normative palette; source tokens live in `apps/ios/src/design/tokens.ts`.

### Primary

- **Programme gold (`accent`):** primary actions, selected chips and segments, active navigation and rank scores.

### Neutral

- **Plum page (`background`):** screen canvas, navigation chrome and ink on filled actions.
- **Plum paper (`surface`):** quiet insets, inputs, secondary buttons and missing-poster backgrounds.
- **Raised plum (`elevated`):** higher tonal layer available in the shared palette; do not turn ordinary rows into elevated cards.
- **Fine plum rule (`border`):** separators and control boundaries.
- **Warm cream (`text`):** headings, titles and readable body copy.
- **Programme annotation (`muted`):** metadata, secondary explanation and inactive navigation.

Success and danger tokens carry feedback meaning; they are not competing brand accents. Errors use danger text and an accessible alert.

**The Quiet Accent Rule.** Reserve the action tint for interaction, selection and actual scores; artwork supplies visual variety.

## Typography

**Display Font:** Georgia on iOS; Georgia with serif fallback on web; serif on other platforms.

**Body Font:** the platform system font. React Native inherits this font rather than naming a custom body family.

Georgia gives headings and editorial title rows their programme character. Body text, metadata, labels and controls remain system type. Poster-rail captions use system type; the editorial title-row rule does not replace every label with a serif.

The frontmatter records the shared hierarchy: large heading, section heading, media-row title, body, control label, caption and uppercase eyebrow. Comparison titles use Georgia at 20-point size with 26-point line height. Rank ordinals and scores use system tabular numerals for stable alignment. Do not impose a new line height where the shared heading styles leave it native.

**The Editorial Voice Rule.** Use Georgia for headings and programme title rows; keep functional controls in system type.

## Layout

The shared Screen respects top and side safe areas, scrolls by default and uses the screen inset, content gap and bottom clearance from frontmatter. Section uses its own gap and top margin; `inset` removes that top margin inside a containing surface. Horizontal rails scroll independently. Rank and Watchlist use list content with bottom clearance rather than placing a nested vertical list in a ScrollView.

Home’s feature spans the content width and crops artwork with cover sizing. Its height increases for larger font scale; supporting title, reason and action remain below the artwork. Continue ranking uses a padded surface inset; Watch tonight uses a horizontal poster rail. Other routes use headings, controls, ruled lists and grouped detail sections.

There is no defined desktop breakpoint system. Window width and font scale drive native layout adjustments. Comparison cards stack when text scaling requires it. Keep large text within scrolling content and avoid fixed-height text containers.

## Elevation & Depth

The interface uses tonal layering and fine rules, with no custom shadow vocabulary. A surface inset is enough to distinguish Continue ranking or privacy context from the page. Native stacks, tabs, form sheets and modals provide their platform depth and transitions. There is no custom motion system; preserve native interaction and reduced-motion behavior.

**The Programme Rule.** Let typography, artwork and separators structure the page; use filled containers only when the content benefits from an inset.

## Shapes

Posters have nearly square corners and normally retain a 2:3 proportion; Home’s approved feature is a deliberate crop. Controls use the shared rounded shape, chips a softer capsule, and inset surfaces a modest curve. Borders and row separators are one logical point. The profile avatar is circular. Preserve minimum heights instead of fixing heights that could clip scaled text.

## Components

### Buttons

Primary buttons fill with the action tint and use plum ink. Secondary buttons use a surface fill, cream text and a fine border. Both have a 48-point minimum height, shared control radius and 12-point vertical/18-point horizontal padding. Pressed opacity is 0.75; disabled opacity is 0.45. Icon buttons use a 44-point square hit area, an accessible label and pressed opacity of 0.6.

### Chips and Segments

Chips have a 44-point minimum height, fine border and shared chip radius. Selection changes fill and border to the action tint and text to plum ink. Segments sit inside a bordered surface with 3-point padding; each segment has a 44-point minimum height and uses the action tint when selected. Their accessible selected state follows the actual value.

### Cards / Containers

Continue ranking and contextual privacy content use the shared inset surface, radius and padding. Section headers align heading and action with room for text to shrink or wrap. Empty states use a heading, muted explanation and an available next action, without invented activity.

### Inputs / Fields

Inputs use a surface background, cream text, fine border, shared control radius, 14-point padding and a 48-point minimum height. Preserve explicit labels, honest unknown-date options and local/owner-only private-note language. No custom focus glow is implemented; native text input behavior remains authoritative.

### Navigation

Five labeled tabs remain Home, Discover, Rank, Watchlist and Profile. iOS uses NativeTabs and SF Symbols; the preview fallback uses JavaScript tabs and Ionicons. Stacks handle media detail, search and settings. Logging opens a native form sheet; comparisons open a modal. Keep platform gestures and native transitions.

### Posters and Programme Rows

Real catalog poster URLs render with cover sizing. Missing real artwork displays Poster unavailable; fixtures retain the original abstract artwork. Posters open detail and carry descriptive accessibility labels. Programme rows combine a compact poster, Georgia title, system metadata and a fine bottom rule. Rank rows place ordinal left and score right, with Provisional visible when applicable; unplaced scores show an em dash.

### Logging and Comparison

Sentiment choices save durably before automatically opening targeted comparisons. Comparison posters hide scores. Keep Skip, Can’t decide, Similar, Undo and Finish later available according to the session state. Continue placement until a score exists; when no useful pair remains, explain the saved watch and allow finishing later. Movie and TV rankings stay separate and TV eligibility remains explicit. Filters view the existing fit rather than refitting it.

## Do's and Don'ts

### Do:

- **Do** apply Festival Programme across every route, including Home’s approved feature-and-rail composition.
- **Do** keep text scalable, content scrollable and controls reachable with native navigation.
- **Do** retain actual source labels, unknown dates/runtime and local-preview disclosure.
- **Do** save sentiment durably before opening targeted comparisons, then continue placement until a score exists or no useful pair remains.
- **Do** keep movie and TV fits separate, with explicit TV seen-enough eligibility and owner-only private notes.

### Don't:

- **Don’t** restore the superseded charcoal/system-heading board direction.
- **Don’t** add poster watchlist ribbons; expose saved state and actions on the detail screen.
- **Don’t** show scores on comparison posters or infer a score from sentiment alone.
- **Don’t** fabricate social activity, taste percentages or provider availability.
- **Don’t** present the local preview as authenticated production service or claim native accessibility/device release checks have passed.
