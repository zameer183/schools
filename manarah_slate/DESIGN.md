# Design System Document: The Scholarly Editorial

## 1. Overview & Creative North Star

**Creative North Star: The Academic Atelier**
This design system rejects the "cookie-cutter" SaaS aesthetic in favor of a high-end editorial experience. It envisions the Student Management System not as a utility, but as a curated academic environment. By moving away from rigid grids and 1px borders, we embrace **Soft Minimalism**—a philosophy where data is elevated through breathing room, sophisticated tonal shifts, and intentional asymmetry.

The system is designed to feel authoritative yet welcoming, utilizing the deep teal and gold of the institution's identity to create a sense of heritage modernized for the digital age. We break the "template" look by using overlapping surface layers and high-contrast typography that guides the eye with editorial precision.

---

## 2. Colors

The palette is derived from the core identity, emphasizing a "Teal-Heavy" professional foundation with "Gold-Accented" moments of triumph.

### Primary & Secondary Roles
*   **Primary (#004649):** Used for primary actions and navigational anchors. It represents stability and depth.
*   **Secondary (#865300):** Reserved for "Golden Moments"—student achievements, high-priority alerts, or call-to-actions that require a warm, human touch.
*   **Surface Hierarchy:** We utilize a tiered surface system to create depth without clutter.
    *   `surface`: The base canvas (#f8f9fa).
    *   `surface_container_lowest`: Pure white (#ffffff) for high-focus cards.
    *   `surface_container_high`: Subtle gray (#e7e8e9) for grouping secondary data.

### The "No-Line" Rule
**Explicit Instruction:** Traditional 1px solid borders are prohibited for sectioning. Structural boundaries must be defined solely through background color shifts. If a sidebar needs to be separated from the main content, do not draw a line; instead, set the sidebar to `surface_container_low` against a `surface` background.

### The Glass & Gradient Rule
To achieve a premium, custom feel:
*   **Floating Navigation:** Use Glassmorphism (semi-transparent `surface` with a 20px backdrop-blur) for top bars.
*   **Signature Gradients:** Main CTAs should utilize a subtle linear gradient from `primary` (#004649) to `primary_container` (#1B5E62) at a 135-degree angle to provide "visual soul."

---

## 3. Typography

The typography strategy balances the modern technicality of **Inter** with the elegant, wide-stature personality of **Manrope**.

*   **Display & Headlines (Manrope):** These are our editorial anchors. Large, bold, and authoritative. The wide tracking of Manrope gives the HMS a "luxury" feel, making even a student's name feel significant.
*   **Body & Labels (Inter):** Inter is used for high-density data. It is neutral, highly legible, and keeps the interface grounded.

**Hierarchy as Identity:**
Use `display-sm` for dashboard welcomes to establish a personal connection. Use `label-md` in all-caps with 0.05em letter spacing for table headers to create a "professional ledger" appearance.

---

## 4. Elevation & Depth

We achieve hierarchy through **Tonal Layering** rather than traditional structural lines.

*   **The Layering Principle:** Treat the UI as stacked sheets of fine paper. Place a `surface_container_lowest` card on a `surface_container_low` section. This creates a natural, soft lift that is easier on the eyes than high-contrast shadows.
*   **Ambient Shadows:** When a card must "float" (e.g., a modal or a primary student profile), use an extra-diffused shadow: `box-shadow: 0 12px 40px rgba(0, 70, 73, 0.06);`. Notice the shadow is tinted with the Primary color to mimic natural light.
*   **The "Ghost Border" Fallback:** If accessibility requirements demand a border, use `outline_variant` at 15% opacity. It should feel like a suggestion of a line, not a hard stop.

---

## 5. Components

### Buttons
*   **Primary:** Gradient fill (Teal), 12px radius, `title-sm` (Inter Semi-Bold).
*   **Secondary:** Ghost style. No background, `outline` token border at 20%, `on_surface` text.
*   **Tertiary:** Gold text (`secondary`) with no background, used for "View All" or "Edit" actions.

### Cards & Lists
*   **The "No Divider" Rule:** Forbid the use of horizontal lines in lists. Use 16px-24px of vertical white space to separate list items.
*   **Styling:** All cards must use `xl` (1.5rem) or `lg` (1rem) roundedness. Avoid sharp corners at all costs.

### Input Fields
*   **Style:** Minimalist. No bottom line or full box. Use a subtle `surface_variant` background with a 12px corner radius. The label should float above in `label-md` weight.

### Student Growth Charts
*   **Aesthetic:** Use "Elegant Charts"—curved line graphs with a `primary_fixed` gradient area fill. Remove all grid lines except for the baseline.

### Attendance Chips
*   **Action Chips:** High roundedness (`full`). Use `secondary_fixed` for "Present" and `error_container` for "Absent," ensuring the text color meets 4.5:1 contrast ratios.

---

## 6. Do's and Don'ts

### Do:
*   **DO** use whitespace as a functional element. If in doubt, add 8px of padding.
*   **DO** use intentional asymmetry. A large "Student of the Month" card can break the grid to create visual interest.
*   **DO** use the institution's logo as a watermark or subtle background element in empty states.

### Don't:
*   **DON'T** use 100% black text. Use `on_surface` (#191c1d) to maintain a premium, soft-contrast look.
*   **DON'T** use standard 4px "Material Design" shadows. They look "cheap" in an editorial context. Stick to the Tonal Layering or Ambient Shadows described in Section 4.
*   **DON'T** crowd the sidebar. Every icon should have a minimum of 12px breathing room from the text label.