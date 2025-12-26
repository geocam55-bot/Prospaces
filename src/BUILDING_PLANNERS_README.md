# ProSpaces Building Planners Suite

A comprehensive frontend solution for designing and estimating materials for decks, garages, and sheds.

## Overview

The Building Planners Suite provides three specialized planning modules accessible from a unified interface:

1. **Deck Planner** ✅ Fully Functional
2. **Garage Planner** 🚧 Coming Soon  
3. **Shed Planner (Baby Barns)** 🚧 Coming Soon

## Architecture

```
/App.tsx                              # Main app with module navigation
/components/planners/
  DeckPlanner.tsx                     # ✅ Complete deck planning module
  GaragePlanner.tsx                   # 🚧 Preview/stub
  ShedPlanner.tsx                     # 🚧 Preview/stub

/components/deck/                     # ✅ All deck components
  DeckConfigurator.tsx                # Configuration form
  DeckCanvas.tsx                      # 2D canvas visualization
  MaterialsList.tsx                   # BOM display
  DeckTemplates.tsx                   # Quick start templates
  SavedDesigns.tsx                    # Save/load functionality

/types/
  deck.ts                             # TypeScript interfaces
  
/utils/
  deckCalculations.ts                 # Material calculation engine
```

## Module 1: Deck Planner ✅

### Status: **FULLY FUNCTIONAL**

A complete 2D deck design tool with automatic material calculations.

#### Features
- ✅ Interactive configuration form
  - Dimensions (width, length, height)
  - Shape selection (Rectangle, L-Shape ready)
  - Joist spacing (12", 16", 24")
  - Decking pattern (perpendicular, parallel, diagonal)
  - Stairs (location, width)
  - Railings (per side selection)

- ✅ 2D Canvas visualization
  - Top-down plan view
  - Grid background (1 ft scale)
  - Joist layout
  - Decking pattern indicator
  - Stairs with step details
  - Railing indicators (purple lines)
  - Dimension labels
  - Compass rose & legend

- ✅ Automatic Bill of Materials
  - **Framing**: Joists, rim joists, beams, posts
  - **Decking**: Deck boards with 10% waste factor
  - **Stairs**: Stringers and treads
  - **Railing**: Rails, balusters, posts
  - **Hardware**: Joist hangers, screws, anchors, brackets

- ✅ Quick start templates
  - Small Deck (10' × 12')
  - Medium Deck (12' × 16')
  - Large Deck (16' × 20')
  - Ground Level (14' × 14')

- ✅ Print-ready output
  - Professional layout
  - Plan view + materials list
  - Letter-size formatted

### How to Use
1. Select "Deck Planner" from main navigation
2. Choose a template or enter custom dimensions
3. Configure stairs and railings
4. View real-time canvas updates
5. Switch to "Materials" tab for full BOM
6. Click "Print Plan" for customer-ready output

---

## Module 2: Garage Planner 🚧

### Status: **PREVIEW/COMING SOON**

Design single, double, and triple bay garages.

#### Planned Features
- [ ] Bay configuration (single/double/triple)
- [ ] Overhead door selection (8', 9', 16' wide)
- [ ] Walk-in door option
- [ ] Window placements
- [ ] Roof style (gable, hip, flat)
- [ ] Wall height selection
- [ ] Siding material type

#### Planned Materials
- [ ] Wall framing (2×4 or 2×6)
- [ ] Roof trusses
- [ ] Sheathing & siding
- [ ] Overhead garage doors
- [ ] Windows & trim
- [ ] Hardware & fasteners

#### Planned Visualizations
- [ ] Floor plan (top view)
- [ ] Front elevation
- [ ] Side elevation
- [ ] Dimension labels
- [ ] Door & window markers

#### Templates (Planned)
- Single Bay (12' × 20')
- Double Bay (20' × 20')
- Double Bay Large (24' × 24')
- Triple Bay (30' × 24')

---

## Module 3: Shed Planner (Baby Barns) 🚧

### Status: **PREVIEW/COMING SOON**

Design storage sheds and baby barns with gambrel roofs.

#### Planned Features
- [ ] Dimensions (width, length, height)
- [ ] Roof style (gable vs gambrel/barn)
- [ ] Door type (standard, double, sliding barn door)
- [ ] Window options
- [ ] Loft configuration
- [ ] Ramp option
- [ ] Siding material (vinyl, wood, metal)

#### Planned Materials
- [ ] Floor joists & decking
- [ ] Wall framing
- [ ] Roof trusses (gambrel or gable)
- [ ] Sheathing
- [ ] Siding
- [ ] Doors & windows
- [ ] Trim & hardware

#### Planned Visualizations
- [ ] Floor plan view
- [ ] Front elevation (showing gambrel roof profile)
- [ ] Side elevation
- [ ] Loft visualization
- [ ] Interior height markers

#### Templates (Planned)
- Small Shed (8' × 10')
- Medium Shed (10' × 12')
- Large Shed (12' × 16')
- Baby Barn (12' × 20' with loft)

---

## Development Roadmap

### Phase 1: Deck Planner ✅ COMPLETE
- [x] All configuration options
- [x] 2D canvas rendering
- [x] Material calculations
- [x] Templates
- [x] Print functionality

### Phase 2: Garage Planner (Next)
1. Create types (/types/garage.ts)
2. Build configuration component
3. Create 2D canvas (floor plan + elevation)
4. Implement material calculations
5. Add templates
6. Wire up to main app

### Phase 3: Shed Planner
1. Create types (/types/shed.ts)
2. Build configuration component
3. Create 2D canvas with gambrel roof drawing
4. Implement material calculations
5. Add templates
6. Wire up to main app

### Phase 4: Enhancements
- [ ] Supabase integration for save/load
- [ ] Export to PDF (client-side)
- [ ] Export BOM to CSV
- [ ] Cost estimation with pricing
- [ ] Share link generation
- [ ] Integration with CRM Opportunities
- [ ] Product catalog integration (RONA Atlantic)

---

## Technical Implementation

### For Garage Planner

**Types needed:**
```typescript
export interface GarageConfig {
  width: number;
  length: number;
  wallHeight: number;
  bays: 1 | 2 | 3;
  overheadDoorWidth: 8 | 9 | 16;
  hasWalkInDoor: boolean;
  windows: number;
  roofStyle: 'gable' | 'hip' | 'flat';
  roofPitch: string; // e.g., "4/12", "6/12"
  sidingType: 'vinyl' | 'wood' | 'metal';
}
```

**Canvas approach:**
- Top-down floor plan showing bay divisions
- Front elevation showing doors, windows, roof
- Use similar grid system as deck planner
- Add overhead door arcs and window rectangles

### For Shed Planner

**Types needed:**
```typescript
export interface ShedConfig {
  width: number;
  length: number;
  wallHeight: number;
  roofStyle: 'gable' | 'gambrel';
  doorType: 'standard' | 'double' | 'barn';
  doorWidth: number;
  windows: number;
  hasLoft: boolean;
  loftHeight?: number;
  hasRamp: boolean;
  rampWidth?: number;
  sidingType: 'vinyl' | 'wood' | 'metal';
}
```

**Canvas approach:**
- Floor plan with door and window placements
- Front elevation showing gambrel roof profile
- Side elevation showing loft if applicable
- Gambrel roof drawn with two slope angles

---

##Integration with ProSpaces CRM

All planners will integrate with:

1. **Authentication**: ProSpaces SSO
2. **Opportunities**: Link designs to customer opportunities
3. **Quotes**: Generate quotes from BOMs with pricing
4. **Documents**: Save plans as PDF attachments
5. **Activities**: Log design creation/updates
6. **Inventory**: Check RONA Atlantic stock availability

---

## Notes for Future Development

### Material Calculation Patterns

**Framing Pattern:**
```typescript
// Wall framing
const studSpacing = 16; // inches on center
const numberOfStuds = Math.ceil((wallLength * 12) / studSpacing) + 1;
const plateLength = wallLength;
```

**Roof Truss Pattern:**
```typescript
// Trusses
const trussSpacing = 24; // inches on center
const numberOfTrusses = Math.ceil((buildingLength * 12) / trussSpacing) + 1;
```

**Sheathing/Siding Pattern:**
```typescript
// Wall area
const wallArea = (2 * (width + length)) * wallHeight;
// Subtract door/window openings
const sheathing = wallArea - doorArea - windowArea;
const sheetsNeeded = Math.ceil(sheathing / 32); // 4x8 sheets
```

### Canvas Drawing Patterns

**Gambrel Roof (for sheds):**
```typescript
// Two slopes: lower slope steeper (e.g., 12/12), upper slope gentler (e.g., 4/12)
const lowerRun = width / 4;
const lowerRise = lowerRun; // 12/12 pitch
const upperRun = (width / 2) - lowerRun;
const upperRise = upperRun * (4/12); // 4/12 pitch
```

---

## File Structure (Complete)

```
/App.tsx
/components/
  planners/
    DeckPlanner.tsx       ✅
    GaragePlanner.tsx     🚧
    ShedPlanner.tsx       🚧
  deck/
    DeckConfigurator.tsx  ✅
    DeckCanvas.tsx        ✅
    MaterialsList.tsx     ✅
    DeckTemplates.tsx     ✅
    SavedDesigns.tsx      ✅
  garage/                 🚧 To be created
    GarageConfigurator.tsx
    GarageCanvas.tsx
    GarageMaterialsList.tsx
    GarageTemplates.tsx
  shed/                   🚧 To be created
    ShedConfigurator.tsx
    ShedCanvas.tsx
    ShedMaterialsList.tsx
    ShedTemplates.tsx
/types/
  deck.ts               ✅
  garage.ts             🚧 To be created
  shed.ts               🚧 To be created
/utils/
  deckCalculations.ts   ✅
  garageCalculations.ts 🚧 To be created
  shedCalculations.ts   🚧 To be created
```

---

## Getting Started for Developers

### Adding Garage Planner

1. Create `/types/garage.ts` with GarageConfig interface
2. Create `/utils/garageCalculations.ts` with material logic
3. Create `/components/garage/GarageConfigurator.tsx`
4. Create `/components/garage/GarageCanvas.tsx`
5. Copy and adapt MaterialsList, Templates, SavedDesigns
6. Replace GaragePlanner.tsx stub with full component
7. Test all features and print output

### Adding Shed Planner

Follow same pattern as Garage Planner above.

---

## Support

For questions or feature requests, contact the ProSpaces CRM development team.

**Version:** 1.0  
**Last Updated:** December 2024
**Status:** Deck Planner complete, Garage & Shed planners coming soon
