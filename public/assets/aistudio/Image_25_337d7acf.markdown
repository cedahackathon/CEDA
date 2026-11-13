---
name: CEDA Innovation Portal
colors:
  surface: '#fdf9f4'
  surface-dim: '#ddd9d5'
  surface-bright: '#fdf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3ee'
  surface-container: '#f1ede8'
  surface-container-high: '#ebe8e3'
  surface-container-highest: '#e6e2dd'
  on-surface: '#1c1c19'
  on-surface-variant: '#5a413c'
  inverse-surface: '#31302d'
  inverse-on-surface: '#f4f0eb'
  outline: '#8d706b'
  outline-variant: '#e2bfb8'
  surface-tint: '#b12d1b'
  primary: '#7c0700'
  on-primary: '#ffffff'
  primary-container: '#a02010'
  on-primary-container: '#ffb4a7'
  inverse-primary: '#ffb4a7'
  secondary: '#77574e'
  on-secondary: '#ffffff'
  secondary-container: '#ffd3c8'
  on-secondary-container: '#7a5950'
  tertiary: '#6d2200'
  on-tertiary: '#ffffff'
  tertiary-container: '#943100'
  on-tertiary-container: '#ffb599'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad4'
  primary-fixed-dim: '#ffb4a7'
  on-primary-fixed: '#400200'
  on-primary-fixed-variant: '#8f1204'
  secondary-fixed: '#ffdbd1'
  secondary-fixed-dim: '#e7bdb2'
  on-secondary-fixed: '#2c150f'
  on-secondary-fixed-variant: '#5d3f37'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#ffb59a'
  on-tertiary-fixed: '#380d00'
  on-tertiary-fixed-variant: '#802a00'
  background: '#fdf9f4'
  on-background: '#1c1c19'
  surface-variant: '#e6e2dd'
typography:
  headline-xl:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 48px
  headline-xl-mobile:
    fontFamily: Montserrat
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 38px
  headline-lg:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 30px
  headline-sm:
    fontFamily: Montserrat
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 21px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 18px
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system establishes a high-trust, authoritative, and empowering digital experience for the Citizen Entrepreneurial Development Agency (CEDA) of Botswana. It embodies the ethos of "Finance. Develop. Sustain." alongside the national grassroots commitment of #KaeKapaKae ("everywhere / anywhere across Botswana").

### Personality & Emotional Response
The portal must evoke uncompromised institutional credibility, civic pride, operational transparency, and entrepreneurial optimism. Interfaces reject cold bureaucratic aloofness in favor of dignified warmth, cultural alignment, and accessibility for every citizen—from tech innovators in Gaborone to rural agri-business founders across the Chobe and Kgalagadi districts.

### Design Movement
The visual framework aligns with **Modern Corporate Humanism**:
- **Structured Precision:** Crisp, dependable layout grids and clean structural borders ensure clear institutional trust.
- **Warm Earth-Tone Palettes:** Grounded organic mineral tones (rich Kalahari red, deep acacia cocoa, desert amber) balance state authority with welcoming community access.
- **Strict Clarity & Legibility:** Clean typography hierarchy, strict adherence to WCAG AA contrast standards, and tactile focus states ensure complete accessibility across diverse devices and low-bandwidth environments.

## Colors

The palette draws directly from the natural landscape and developmental vitality of Botswana, anchored in rigorous accessibility and functional signaling.

### Core Palette
- **Primary Red (`#A02010`):** Core institutional color for primary actions, critical brand elements, and key navigation states.
  - Hover: `#861A0D`
  - Pressed / Active: `#6E1409`
- **Secondary Cocoa Brown (`#5E4038`):** Deep, organic mineral tone applied to headings, prominent labels, and standard body text. Provides softened, human contrast compared to stark pure black.
- **Accent 1 (Burnt Orange `#F06020`):** Expressive highlight color used for active stages on progress trackers, primary icon accents, and developmental timeline nodes.
- **Accent 2 (Amber `#F8A018`):** Dedicated to attention states, chart secondary series, and global focus rings (`focus-visible`).
- **Accent 3 (Gold `#F8C808`):** Reserved exclusively for prestige indicators: finalist milestones, award winner badges, and merit stars.

### Surfaces & Backgrounds
- **Canvas (`#FBF7F2`):** Warm off-white background eliminating harsh glare while maintaining high contrast.
- **Card Surface (`#FFFFFF`):** Crisp pure white for cards, panels, and data surfaces, bounded by structural borders (`#E8DED5`).
- **Dark Surface (`#3E2A25`):** Deep cocoa used for structural grounding across the global sidebar, header variations, and footers with crisp white (`#FFFFFF`) text.

### Semantic & Feedback Colors
Every status indicator must pair color with both an icon and explicit text label:
- **Success (`#2E7D32`):** Approved applications, verified compliance documents, disbursement clearance.
- **Warning (`#B26A00`):** Pending citizen action, expiring submissions, feedback deadlines.
- **Error (`#C62828`):** Incomplete Omang validation, declined proposals, validation errors.
- **Info (`#1F5F8B`):** System notifications, advisory guidance, procedural tooltips.

### Contrast & Legibility Rules
- Adhere strictly to WCAG AA (minimum 4.5:1 for standard text, 3:1 for large text and UI components).
- Never render white text directly on Burnt Orange (`#F06020`) or Amber (`#F8A018`).
- Never render Burnt Orange or Amber text over white surfaces; always use Dark Cocoa (`#3E2A25`) or Deep Red (`#A02010`) for legible copy on light surfaces.

## Typography

The typographic hierarchy bridges institutional authority with high digital legibility across complex multi-step application forms and dense grant adjudication tables.

### Font Roles
- **Display & Headings (Montserrat):** Set in 600 (Semi-Bold) using strict sentence case. Headings project forward-looking momentum, geometric precision, and entrepreneurial confidence. Never use all-caps for full heading lines.
- **Body & Controls (Inter):** Set in 400 (Regular) and 500 (Medium). Engineered for screen readability, clean tabular figures, and rapid scanning of financial summaries.

### Typographic Rules
- **Line Heights:** Maintained at a standard ratio of 1.5 for all body and UI text blocks to maximize comprehension for multilingual readers.
- **Tabular Figures:** All numeric displays (BWP amounts, scores, Omang identifiers, and dates) must utilize `font-feature-settings: "tnum" 1` to ensure aligned vertical scanning.

## Layout & Spacing

The portal layout adheres to an **8px structural baseline grid** to maintain visual order, structural stability, and programmatic modularity.

### Grid & Max Width
- **Global Content Constraint:** Maximum container width is fixed at `1200px` centered horizontally.
- **Desktop (1024px and above):** 12-column responsive fluid grid with `1.5rem` (24px) gutters and `2rem` (32px) outer canvas margins.
- **Tablet (768px – 1023px):** 8-column fluid grid with `1.5rem` gutters and `1.5rem` outer margins. Application forms collapse into single/double column groupings.
- **Mobile (Below 768px):** 4-column layout with `1rem` (16px) gutters and `1rem` (16px) outer margins. Multi-column form fields reflow sequentially into full-width stacked components.

### Density & Touch Targets
- All interactive controls (buttons, dropdown selects, input triggers, chip targets) enforce a **minimum touch target size of 44px × 44px** to ensure seamless operation on touch displays and mobile field devices.
- Dense data tables allow compact cell heights of 40px provided row actions utilize explicit expanded click zones.

## Elevation & Depth

Visual hierarchy is communicated through structural layering, deliberate border definition, and warm, diffused ambient shadows. Heavy skeuomorphism and floating layered elevations are avoided to maintain an official institutional appearance.

### Depth Hierarchy
- **Level 0 (Flat Canvas):** The base background (`#FBF7F2`). No elevation or drop shadows.
- **Level 1 (Card & Module Surface):** Pure white cards (`#FFFFFF`) sitting on the canvas. Depth is achieved via a crisp 1px structural outline (`#E8DED5`) combined with a warm ambient shadow:
  - `box-shadow: 0 1px 3px rgba(62, 42, 37, 0.06), 0 1px 2px rgba(62, 42, 37, 0.04)`
- **Level 2 (Dropdowns, Menus & Filter Overlays):** Interactive floating elements that raise above neighboring cards:
  - `box-shadow: 0 4px 12px rgba(62, 42, 37, 0.08), 0 2px 4px rgba(62, 42, 37, 0.04)`
  - Structural border: 1px solid `#E8DED5`
- **Level 3 (Modals, Toasts & Critical Dialogs):** High-priority focus layers over a tinted backdrop overlay (`rgba(62, 42, 37, 0.45)` with `backdrop-filter: blur(2px)`):
  - `box-shadow: 0 12px 28px rgba(62, 42, 37, 0.14), 0 4px 8px rgba(62, 42, 37, 0.06)`

### Focus Visibility
Elevation states never replace accessibility focus markers. Any focused component receives an unobstructed, high-visibility 2px outline in Amber (`#F8A018`) with an offset of 2px.

## Shapes

The design uses balanced, modern geometric roundedness to convey approachable governance without sacrificing structural seriousness.

### Shape Scales
- **Interactive Controls (8px / `rounded-md`):** Primary and secondary buttons, input boxes, dropdown menus, textareas, and tabs utilize a consistent 8px corner radius.
- **Cards & Data Panels (12px / `rounded-lg`):** Content cards, pipeline containers, statistical tiles, and modal dialogs use a 12px radius bounded by a 1px `#E8DED5` border.
- **Pill Badges & Indicators (Fully Rounded):** Status chips, pipeline stage number markers, and filter tags use a fully pill-shaped profile (`border-radius: 9999px`) to visually distinguish them from actionable square controls.

## Components

### Buttons
- **Primary:** Deep Red background (`#A02010`), crisp white text (`#FFFFFF`), 8px border-radius, minimum 44px height. Hover: `#861A0D`. Active: `#6E1409`.
- **Secondary / Outlined:** Pure White background, 1px border `#5E4038`, text `#5E4038`. Hover: `#FBF7F2`.
- **Tertiary / Ghost:** No border, text `#5E4038`, background transparent. Hover: `#FBF7F2`.
- **Focus Ring:** 2px solid `#F8A018` with 2px offset on all states.

### 5-Stage Reusable Pipeline Tracker
Visual indicator depicting application lifecycle:
1. `Submission`
2. `Review`
3. `Feedback`
4. `Approval`
5. `Award`
- **Completed Stages:** Solid Deep Red (`#A02010`) disc with white checkmark icon; connecting line filled in `#A02010`.
- **Active Stage:** Burnt Orange (`#F06020`) outer ring, white inner circle, `#F06020` numeric step label, bold text.
- **Upcoming Stages:** White disc with `#E8DED5` border, `#5E4038` muted number; connecting track `#E8DED5`.

### Status Badges
Rendered as pill-shaped elements with matching semantic icons:
- **Draft:** Gray/Cocoa muted fill (`#F5EFEB`), text `#5E4038`.
- **Submitted:** Info light fill (`#E8F2F8`), text `#1F5F8B`, edit-pencil icon.
- **Under Review:** Amber light fill (`#FEF5E7`), text `#B26A00`, clock icon.
- **Feedback Requested:** Amber fill (`#FFF3E0`), text `#B26A00`, alert icon.
- **Resubmitted:** Info fill (`#E8F2F8`), text `#1F5F8B`, refresh icon.
- **Approved:** Success light fill (`#E8F5E9`), text `#2E7D32`, checkmark icon.
- **Declined:** Error light fill (`#FFEBEE`), text `#C62828`, cross icon.
- **Awarded:** Gold light fill (`#FEF9E7`), text `#8C6B00`, star icon.

### Form Inputs & Dropzones
- **Text Inputs & Dropdowns:** 44px height, `#FFFFFF` background, 1px border `#E8DED5`, 8px corner radius, text `#5E4038`. Placeholder in `#8C766F`.
- **File Upload Dropzone:** 2px dashed border in `#E8DED5`, `#FFFFFF` background, upload cloud icon in Burnt Orange (`#F06020`), drag-over active state highlights border to `#A02010`.
- **Scoring Sliders:** 6px track `#E8DED5`, active track `#A02010`, 20px draggable circular thumb `#A02010` with `#FFFFFF` border and subtle shadow.

### Tables & Filter Chips
- **Data Tables:** Sticky table headers with `#FBF7F2` background, 1px bottom border `#E8DED5`, uppercase caption text in `#5E4038`. Alternate row striping optional (`#FCFAF7`).
- **Filter Chips:** Pill-shaped, 1px border `#E8DED5`, background `#FFFFFF`. Active state uses `#5E4038` background with `#FFFFFF` text.

### Stat Cards
- Enclosed in standard 12px rounded cards with 1px `#E8DED5` borders. Features an accent top-border line (3px height) in Primary Red or Burnt Orange, large tabular figure display (28px Inter), metric label (14px Cocoa), and localized indicator trend chip.

### Botswana Localization Conventions
- **Currency Display:** Always format as BWP / Pula with capital `P` and a non-breaking space (e.g., `P 1,500.00` or `P 250,000.00`). Tabular numeric spacing must be enforced.
- **Date & Time:** Standard date notation formatted as `DD Month YYYY` (e.g., `14 September 2025`). System timestamps must reflect Central Africa Time (CAT / UTC+2).
- **Identity Fields:** Native support for the 9-digit Botswana National Identity Card (**Omang**) with automatic regex masking (`XXXX1XXXX`), and foreign Passport Number validation.
- **Institutional Integration:** Explicit fields for Companies and Intellectual Property Authority (**CIPA**) registration numbers and Botswana Unified Revenue Service (**BURS**) Tax Identification Numbers (TIN).
- **Administrative Districts:** Native select inputs supporting all Botswana administrative divisions: Gaborone, Francistown, Maun, Kasane, Lobatse, Selibe Phikwe, Jwaneng, Kgalagadi, Ghanzi, Central, South East, Kgatleng, Kweneng, Southern, and North West.
- **Regulatory Footing:** Persistent legal and consent notices confirming compliance with the **Botswana Data Protection Act (BDPA)** regarding applicant data privacy.