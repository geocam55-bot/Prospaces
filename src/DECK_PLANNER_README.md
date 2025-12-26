# ProSpaces 2D Deck Planner

A frontend-focused deck design and material estimation tool for ProSpaces CRM.

## Features

### ✅ Implemented (MVP)

1. **Interactive Configuration Form**
   - Deck dimensions (width, length, height)
   - Shape selection (Rectangle, L-Shape ready)
   - Joist spacing options (12", 16", 24" on center)
   - Decking pattern (perpendicular, parallel, diagonal)
   - Stairs configuration (location, width)
   - Railing selection by side

2. **2D Canvas Visualization**
   - Top-down plan view with measurements
   - Grid background (1 ft scale)
   - Joist layout display
   - Decking pattern indicator
   - Stairs with step details
   - Railing indicators (purple lines)
   - Dimension labels
   - Compass rose
   - Legend

3. **Automatic Bill of Materials (BOM)**
   - **Framing**: Joists, rim joists, beams, posts
   - **Decking**: Deck boards with 10% waste factor
   - **Stairs**: Stringers and treads
   - **Railing**: Top/bottom rails, balusters, posts
   - **Hardware**: Joist hangers, screws, post anchors, brackets
   - Quantity calculations based on dimensions
   - Notes with installation details

4. **Quick Start Templates**
   - Small Deck (10' × 12')
   - Medium Deck (12' × 16')
   - Large Deck (16' × 20')
   - Ground Level (14' × 14')

5. **Print-Ready Output**
   - Professional print layout
   - Plan view + Materials list
   - Formatted for letter-size paper
   - Includes important safety notes

6. **Three View Modes**
   - **Design Tab**: Configuration + Canvas preview
   - **Materials Tab**: Full detailed BOM
   - **Saved Designs Tab**: Load previous designs (Supabase ready)

## Usage

### Starting a New Design

1. **Use a Template** (Quick Start)
   - Click one of the template buttons
   - Modify dimensions as needed

2. **Start from Scratch**
   - Enter deck width and length
   - Set height above ground
   - Choose joist spacing
   - Select decking pattern

### Adding Stairs

1. Toggle "Include Stairs" switch
2. Select stair location (front, back, left, right)
3. Set stair width (default 4 ft)

### Adding Railings

1. Check boxes for each side that needs railing
2. Purple lines show railing locations on canvas
3. Stair openings automatically excluded from railing

### Viewing Materials

- **Quick Summary**: Shows in Design tab below canvas
- **Full BOM**: Switch to Materials tab for detailed breakdown
- Categories: Framing, Decking, Railing, Hardware

### Printing

1. Click "Print Plan" button
2. Browser print dialog opens
3. Output includes:
   - Plan view with dimensions
   - Complete materials list
   - Important safety notes

## Technical Details

### Calculations

**Deck Area**
```
Area = Width × Length
```

**Joists**
```
Number of Joists = (Width ÷ Spacing) + 1
Spacing options: 12", 16", or 24" on center
```

**Decking Boards**
```
Boards = (Area × 1.1 × 12) ÷ (5.5 × Length)
10% waste factor included
```

**Railing**
```
Linear Feet = Sum of selected sides - Stair width
Posts every 6 feet maximum
Balusters ~3 per linear foot (4" spacing)
```

**Stairs**
```
Steps = Deck Height ÷ 7" (typical riser)
3 stringers standard
2 treads per step
```

### File Structure

```
/App.tsx                          # Main app with tabs
/types/deck.ts                    # TypeScript interfaces
/utils/deckCalculations.ts        # Material calculation logic
/components/
  DeckConfigurator.tsx            # Configuration form
  DeckCanvas.tsx                  # 2D canvas drawing
  MaterialsList.tsx               # BOM display
  DeckTemplates.tsx               # Quick start templates
  SavedDesigns.tsx                # Saved designs (Supabase ready)
/styles/globals.css               # Includes print styles
```

## Future Enhancements

### Phase 2
- [ ] L-shape deck support (UI ready)
- [ ] Multi-level decks
- [ ] Supabase integration for save/load
- [ ] Export to PDF (client-side)
- [ ] Export BOM to CSV
- [ ] Cost estimation with pricing data
- [ ] Share link generation

### Phase 3
- [ ] Photo backdrop import
- [ ] Multiple beam configurations
- [ ] Custom lumber sizes
- [ ] Regional building code presets
- [ ] Hardware brand selection (Simpson, MiTek, etc.)
- [ ] Dealer locator integration
- [ ] Manager approval workflow
- [ ] Integration with ProSpaces CRM Opportunities

## Integration with ProSpaces CRM

Ready for integration:

1. **Authentication**: Uses ProSpaces SSO (to be connected)
2. **Role-Based Access**: 
   - Standard Users: Create designs
   - Managers: Approve, adjust pricing
   - Admins: Manage templates and product libraries

3. **CRM Linking**:
   - Designs can be attached to Opportunities
   - Customer info pre-populated
   - Activity logging

4. **Data Storage**:
   - Supabase schema ready
   - Design metadata + JSON geometry
   - Version history support

## Notes

- All measurements in feet (metric support ready)
- Material quantities are estimates
- Professional installation recommended
- Verify with local building codes
- Concrete footings not included in BOM
