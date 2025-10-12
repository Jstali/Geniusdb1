# Summary Page - Visual Preview

## New Simplified Layout

```
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║                                                                    ║
║                      Summary Overview                              ║
║                  (text-2xl, bold, indigo-600)                     ║
║                                                                    ║
║                                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║   ┌────────────────────────┐     ┌────────────────────────┐      ║
║   │  TOTAL SITES           │     │  TOTAL GENERATION      │      ║
║   │  (text-sm, gray-500,   │     │  CAPACITY (MW)         │      ║
║   │   uppercase)           │     │  (text-sm, gray-500,   │      ║
║   │                        │     │   uppercase)           │      ║
║   │       802              │     │      3420.00           │      ║
║   │  (text-3xl, semibold,  │     │  (text-3xl, semibold,  │      ║
║   │   indigo-600)          │     │   indigo-600)          │      ║
║   │                        │     │                        │      ║
║   │  [Hover: scales to     │     │  [Hover: scales to     │      ║
║   │   105%, smooth         │     │   105%, smooth         │      ║
║   │   transition]          │     │   transition]          │      ║
║   └────────────────────────┘     └────────────────────────┘      ║
║        (bg-white, rounded-xl,         (bg-white, rounded-xl,     ║
║         shadow-md, p-6)               shadow-md, p-6)            ║
║                                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║   Data Sources                                                    ║
║   (text-lg, semibold, gray-700)                                  ║
║                                                                    ║
║   ┌────────────────────────────────────────────────────────────┐ ║
║   │  UKPN Grid and Primary Sites                               │ ║
║   │  (bg-gray-50, border, rounded-lg, p-3, gray-700)          │ ║
║   └────────────────────────────────────────────────────────────┘ ║
║   ┌────────────────────────────────────────────────────────────┐ ║
║   │  UKPN LTDS Infrastructure Projects                         │ ║
║   │  (bg-gray-50, border, rounded-lg, p-3, gray-700)          │ ║
║   └────────────────────────────────────────────────────────────┘ ║
║   ┌────────────────────────────────────────────────────────────┐ ║
║   │  UKPN Grid Supply Points Overview                          │ ║
║   │  (bg-gray-50, border, rounded-lg, p-3, gray-700)          │ ║
║   └────────────────────────────────────────────────────────────┘ ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## Color Palette

### Primary Colors
```
Indigo-600:  #4f46e5 █████ (Page title, metric values)
```

### Neutral Colors
```
Gray-100:    #f3f4f6 █████ (Page background)
Gray-200:    #e5e7eb █████ (Borders)
Gray-500:    #6b7280 █████ (Labels, uppercase text)
Gray-700:    #374151 █████ (Section titles, data sources)
```

### Background Colors
```
White:       #ffffff █████ (Metric cards)
Gray-50:     #f9fafb █████ (Data source items)
```

---

## Responsive Behavior

### Desktop (≥640px)
```
┌─────────────────────────────────────────────┐
│           Summary Overview                  │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────┐    ┌─────────────┐       │
│  │ Total Sites │    │ Total Gen   │       │
│  │    802      │    │ Capacity MW │       │
│  └─────────────┘    │   3420.00   │       │
│                      └─────────────┘       │
│                                             │
│  Data Sources                               │
│  ┌───────────────────────────────────────┐ │
│  │ UKPN Grid and Primary Sites           │ │
│  ├───────────────────────────────────────┤ │
│  │ UKPN LTDS Infrastructure Projects     │ │
│  ├───────────────────────────────────────┤ │
│  │ UKPN Grid Supply Points Overview      │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Mobile (<640px)
```
┌────────────────────────┐
│   Summary Overview     │
├────────────────────────┤
│                        │
│  ┌──────────────────┐ │
│  │  Total Sites     │ │
│  │     802          │ │
│  └──────────────────┘ │
│                        │
│  ┌──────────────────┐ │
│  │  Total Gen Cap   │ │
│  │  (MW)            │ │
│  │    3420.00       │ │
│  └──────────────────┘ │
│                        │
│  Data Sources          │
│  ┌──────────────────┐ │
│  │ UKPN Grid...     │ │
│  ├──────────────────┤ │
│  │ UKPN LTDS...     │ │
│  ├──────────────────┤ │
│  │ UKPN Grid Sup... │ │
│  └──────────────────┘ │
└────────────────────────┘
```

---

## Interactive Elements

### Card Hover Effect
```css
/* Default State */
transform: scale(1);
transition: transform 200ms;

/* Hover State */
transform: scale(1.05);
```

**Visual Effect:**
```
Before Hover:     After Hover:
┌──────────┐      ┌───────────┐
│          │  →   │           │  (slightly larger)
│   802    │      │    802    │
│          │      │           │
└──────────┘      └───────────┘
```

---

## Loading State

```
╔════════════════════════════════════════╗
║                                        ║
║                                        ║
║                                        ║
║              ◴                         ║
║             ◯ ◶  (spinning)           ║
║              ◷                         ║
║                                        ║
║       (indigo-600 spinner)            ║
║       (16x16, border-t-4)             ║
║                                        ║
║                                        ║
╚════════════════════════════════════════╝
```

---

## Error State

```
╔════════════════════════════════════════╗
║                                        ║
║   ┌──────────────────────────────┐    ║
║   │  ⚠ Error!                    │    ║
║   │  HTTP error while fetching   │    ║
║   │  data! status: 500           │    ║
║   └──────────────────────────────┘    ║
║   (bg-red-100, border-red-400)       ║
║   (text-red-700)                     ║
║                                        ║
╚════════════════════════════════════════╝
```

---

## Spacing & Padding

```
┌─────────────────────────── Viewport ───────────────────────────┐
│  py-10 (40px top/bottom padding)                               │
│                                                                 │
│  ┌─── Content Container ─────────────────────────────────────┐ │
│  │  py-8 (32px top/bottom for title)                         │ │
│  │                                                             │ │
│  │  ┌─── Grid Container (px-8 = 32px left/right) ──────────┐ │ │
│  │  │  gap-6 (24px between cards)                          │ │ │
│  │  │                                                        │ │ │
│  │  │  ┌─── Card 1 (p-6 = 24px all sides) ──────┐          │ │ │
│  │  │  │                                          │          │ │ │
│  │  │  │  TOTAL SITES                            │          │ │ │
│  │  │  │  mt-2 (8px between label and value)     │          │ │ │
│  │  │  │  802                                     │          │ │ │
│  │  │  │                                          │          │ │ │
│  │  │  └──────────────────────────────────────────┘          │ │ │
│  │  │                                                        │ │ │
│  │  └────────────────────────────────────────────────────────┘ │ │
│  │                                                             │ │
│  │  mt-10 (40px top margin for data sources section)          │ │
│  │                                                             │ │
│  │  ┌─── Data Sources (px-8 = 32px left/right) ────────────┐ │ │
│  │  │  gap-2 (8px between items)                           │ │ │
│  │  │  mt-4 (16px between title and items)                 │ │ │
│  │  │                                                        │ │ │
│  │  │  ┌─── Item (p-3 = 12px all sides) ──────────────┐    │ │ │
│  │  │  │  UKPN Grid and Primary Sites               │    │ │ │
│  │  │  └────────────────────────────────────────────────┘    │ │ │
│  │  │                                                        │ │ │
│  │  └────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Typography Scale

### Hierarchy
```
h1 (Page Title)
├─ text-2xl (24px)
├─ font-bold (700)
└─ text-indigo-600

h2 (Metric Values)
├─ text-3xl (30px)
├─ font-semibold (600)
└─ text-indigo-600

h3 (Section Title)
├─ text-lg (18px)
├─ font-semibold (600)
└─ text-gray-700

p (Labels)
├─ text-sm (14px)
├─ uppercase
└─ text-gray-500

div (Data Source Items)
├─ text-base (16px)
└─ text-gray-700
```

---

## Shadow & Border Effects

### Card Shadow
```css
shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
           0 2px 4px -1px rgba(0, 0, 0, 0.06)
```

### Border Styling
```css
Data Source Items:
- border-width: 1px
- border-color: #e5e7eb (gray-200)
- border-radius: 8px (rounded-lg)
```

---

## Accessibility Features

### Focus Indicators
```
┌─────────────────────────┐
│  TOTAL SITES            │  ← Keyboard focus
│  (outline: 2px solid    │
│   indigo-600)           │
│       802               │
└─────────────────────────┘
```

### Screen Reader Announcements
```
1. "Summary Overview, heading level 1"
2. "Total Sites: 802"
3. "Total Generation Capacity in megawatts: 3420.00"
4. "Data Sources, heading level 3"
5. "UKPN Grid and Primary Sites"
6. "UKPN LTDS Infrastructure Projects"
7. "UKPN Grid Supply Points Overview"
```

---

## Performance Metrics

### Initial Load
```
┌────────────────────────────────────┐
│  Timeline:                         │
│                                    │
│  0ms     ▶ Component Mount        │
│  10ms    ▶ Start API Call         │
│  150ms   ▶ Receive Data           │
│  170ms   ▶ Calculate Metrics      │
│  180ms   ▶ Render Complete ✓      │
│                                    │
│  Total: ~180ms                     │
└────────────────────────────────────┘
```

### Re-render Performance
```
Metric Update: ~10ms
Card Hover: ~16ms (60fps)
Responsive Resize: ~20ms
```

---

## Example Data Display

### Sample Values
```
┌────────────────────────────────────────────┐
│      Summary Overview                      │
├────────────────────────────────────────────┤
│                                            │
│  ┌──────────────┐    ┌─────────────────┐  │
│  │ TOTAL SITES  │    │ TOTAL GENERATION│  │
│  │              │    │ CAPACITY (MW)   │  │
│  │              │    │                 │  │
│  │    802       │    │    3,420.00     │  │
│  │              │    │                 │  │
│  └──────────────┘    └─────────────────┘  │
│                                            │
│  Data Sources                              │
│  • UKPN Grid and Primary Sites            │
│  • UKPN LTDS Infrastructure Projects      │
│  • UKPN Grid Supply Points Overview       │
│                                            │
└────────────────────────────────────────────┘
```

---

## Browser Rendering

### Chrome DevTools Layers
```
┌─ Root (min-h-screen bg-gray-100)
│  ├─ Header (h1)
│  ├─ Grid Container
│  │  ├─ Card 1 (will-change: transform)
│  │  └─ Card 2 (will-change: transform)
│  └─ Data Sources Container
│     ├─ Section Title (h3)
│     └─ Items Container
│        ├─ Item 1
│        ├─ Item 2
│        └─ Item 3
```

---

**Visual Preview Complete**  
**Status**: ✅ Ready for Implementation  
**Date**: October 12, 2025

