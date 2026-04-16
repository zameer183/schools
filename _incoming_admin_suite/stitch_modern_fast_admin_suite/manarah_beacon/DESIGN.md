# Design System Strategy: Manarah Institute Admin

## 1. Overview & Creative North Star
**The Creative North Star: "The Academic Curator"**

The Manarah Institute experience is not a generic management tool; it is a premium editorial platform for educational excellence. We are moving away from the "app-in-a-box" aesthetic characterized by rigid borders and flat grids. Instead, we embrace **The Academic Curator**—a design philosophy that treats administrative data with the prestige of a high-end journal. 

By leveraging intentional asymmetry, overlapping tonal surfaces, and a sophisticated typographic scale, we create a sense of "organized breathing room." The layout should feel like a series of meticulously arranged, high-quality paper stocks and glass layers, emphasizing efficiency through visual calm rather than information density.

---

## 2. Colors & Tonal Depth

Our palette is rooted in the Deep Teal and Warm Gold of the Manarah identity, but its application must be nuanced to feel premium.

### Surface Hierarchy & Nesting
To achieve depth without clutter, we utilize **Tonal Layering**. 
- **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Contrast must be achieved through background shifts.
- **Layering Logic:**
    - Base Level: `surface` (#f9f9f9)
    - Section Level: `surface-container-low` (#f3f4f3)
    - Content Level: `surface-container-lowest` (#ffffff) for primary cards and interaction zones.
- **The "Glass & Gradient" Rule:** Use Glassmorphism for floating navigation elements or modal overlays. Apply `surface` colors at 80% opacity with a `24px` backdrop-blur. 
- **Signature Textures:** For primary call-to-actions and hero dashboard headers, use a subtle linear gradient: `primary` (#124346) to `primary-container` (#2D5A5E). This adds a "soul" to the interface that flat fills lack.

---

## 3. Typography: Editorial Authority

We use a dual-font system to balance character with utility. 

- **Display & Headlines (Manrope):** This is our "Editorial" voice. Manrope’s geometric yet warm curves provide a modern, authoritative feel. Use `headline-lg` (2rem) for page titles to establish clear entry points.
- **Body & Labels (Inter):** Inter is our "Utility" voice. Its high x-height ensures maximum readability for complex administrative data (student lists, finance reports).
- **Hierarchy Tip:** Use `secondary` (#895100) for `label-md` elements to highlight specific status metadata or "new" indicators without using heavy background fills.

---

## 4. Elevation & Depth: The Layering Principle

Forget the traditional drop-shadow. We define importance through "Natural Lift."

- **Ambient Shadows:** When an element must float (e.g., a floating action button or a critical notification), use an extra-diffused shadow. 
    - *Value:* `0px 12px 32px rgba(26, 28, 28, 0.06)`
    - *Tone:* The shadow must be a tinted version of `on-surface`, never a pure black/grey.
- **The "Ghost Border" Fallback:** If accessibility requirements demand a boundary, use a "Ghost Border": `outline-variant` (#c0c8c9) at **15% opacity**. This provides a hint of structure without the "boxed-in" feeling.
- **Soft Asymmetry:** Align dashboard cards to a 12-column grid, but allow specific "insight cards" to break the vertical rhythm by using larger top-margins (e.g., `spacing-xl`), creating a more custom, less-templated flow.

---

## 5. Components

### Dashboard Cards
- **Structure:** No borders. Use `surface-container-lowest` on top of a `surface-container-low` background.
- **Radius:** Always use `xl` (0.75rem) for main cards to soften the professional tone.
- **Content:** Forbid divider lines. Separate "Title" from "Value" using 16px of vertical white space.

### List Items
- **Interactions:** On hover or tap, shift the background from `surface` to `surface-container-high`.
- **Dividers:** Do not use lines. Use a `8px` vertical gap between list items to create a "chunked" appearance that is easier to scan.

### Status Indicators
- **Style:** Use `secondary_container` (#fead51) for "Warning/Pending" and `primary_fixed` (#bcebef) for "Active/Success."
- **Typography:** Always use `label-sm` in All-Caps with 0.05em letter spacing for a professional, "tabbed" look.

### Buttons
- **Primary:** `primary` (#124346) fill with `on-primary` text. No border. 
- **Secondary:** Transparent fill with a `secondary` (#895100) text and a "Ghost Border."
- **Tertiary/Ghost:** No fill, `primary` text. Use for low-priority dashboard actions.

### Academic Context Components
- **The Progress Rail:** A slim, 4px height bar using `primary-fixed` as the track and `primary` as the indicator to show student attendance or syllabus completion.
- **Floating Insight Chips:** Small, high-radius (`full`) chips that float in the top right of a container to show "Real-time" or "Live" status.

---

## 6. Do's and Don'ts

### Do
- **Do** use negative space as a functional tool. If the screen feels "busy," increase the padding rather than adding a line.
- **Do** use `secondary` (Gold) sparingly as a "Jewel Tone" to draw eyes to specific revenue figures or urgent alerts.
- **Do** ensure all touch targets are at least 48x48dp, even if the visual element (like a status dot) is smaller.

### Don't
- **Don't** use 100% opaque black for text. Use `on-surface` (#1a1c1c) to keep the editorial feel soft.
- **Don't** use "default" Material Design shadows. They are too heavy for the Manarah brand. Always use the Ambient Shadow spec.
- **Don't** use dividers to separate sections. If a section is different, give it a different `surface-container` background color.