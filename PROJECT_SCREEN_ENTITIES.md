# Project Screen Entities

Exploration of the game screen in `c:\Users\ADMIN\Documents\GitHub\template-vite-ts` (Phaser 4 + Vite TypeScript template).

## Screen Overview

- **Game resolution:** 960 x 640 px
- **Background:** 5-layer parallax day sky + a large foreground overlay
- **Ground line:** y ≈ 448 px
- **Scrollable:** horizontal camera pan with WASD / arrow keys
- **Level tileset:** craftpix-net-924041-power-station-free-tileset-pixel-art (industrial / power-station theme)

## Machines on Screen

Six machines / energy objects are spawned along the ground line (`y = 448`). The debug buttons in `Game.ts` label them as Crane, Mach 1, Mach 2, Mach 3, Mach 4, and Oil.

| # | Debug Label | Asset Key | File | Position | Scale | Animated | Size (frame) | Appearance |
|---|-------------|-----------|------|----------|-------|----------|--------------|------------|
| 1 | Crane | `energy-1` | `energy_object/1.png` | (200, 448) | 0.5 | Yes | 264 x 160 px | Very long horizontal spritesheet (2112 x 160 px). Dark purple / brown industrial palette (#684e51, #572030, #5e0a32). Looks like a large animated crane or heavy industrial arm. |
| 2 | Mach 1 | `energy-2` | `energy_object/2.png` | (600, 448) | 0.5 | Yes | 100 x 70 px | 600 x 70 px spritesheet, 6 frames. Muted grey / beige / purple (#97907e, #5d5f74, #5e3148). Small mechanical unit, possibly a generator or pump. |
| 3 | Mach 2 | `energy-3` | `energy_object/3.png` | (1000, 448) | 0.8 | Yes | 74 x 36 px | 296 x 36 px spritesheet, 4 frames. Cool blue-grey / muted red (#84929d, #80696f, #6a444d). Compact horizontal machine, possibly a conveyor or vent. |
| 4 | Mach 3 | `machine-3` | `energy_object/1_5.png` | (1400, 448) | 0.5 | No | 145 x 59 px | Static image. Dark purple / grey with rounded body, panel-like front, and a small base. Looks like a stationary control box or machine housing. |
| 5 | Mach 4 | `machine-4` | `energy_object/1_6.png` | (1800, 448) | 0.8 | No | 69 x 37 px | Static image. Dark blue-grey industrial block (#4e5f82, #25213e). Rectangular with a lighter front panel / window. Looks like a small monitor, cabinet, or terminal. |
| 6 | Oil | `oil-reserve` | `energy_object/2_oil.png` | (2300, 448) | 0.8 | No | 345 x 237 px | Large static image. Light blue-grey metal barrel / tank (#a6c0cc, #8babbf, #6d829a). Cylindrical drum shape with horizontal bands and rim details. |

## NPCs on Screen

Three scientist NPCs are spawned in the air (`y = 200`) and fall onto the level geometry. They use the `NPC` class with idle/walk AI.

| # | Spawn Position | Idle Asset | Walk Asset | Sprite Sheet | Colors | Appearance Notes |
|---|----------------|------------|------------|--------------|--------|------------------|
| 1 | (300, 200) | `scientist-1-idle` | `scientist-1-walk` | Idle: 786 x 128 px (6 frames), Walk: 1536 x 128 px (12 frames) | Warm browns / tans (#a98039, #463828, #b38738) | Scientist in tan / brown coat. 128 px tall sprite. Walks with 12 frames, idles with 6 frames. |
| 2 | (900, 200) | `scientist-2-idle` | `scientist-2-walk` | Idle: 768 x 128 px (6 frames), Walk: 1536 x 128 px (12 frames) | Cool greens / greys (#3b4d48, #272b2e, #405f52) | Scientist in greenish / grey coat. 128 px tall sprite. Same animation frame counts. |
| 3 | (1500, 200) | `scientist-3-idle` | `scientist-3-walk` | Idle: 896 x 128 px (7 frames), Walk: 1536 x 128 px (12 frames) | Burgundy / dark red (#71354a, #3e192a, #613645) | Scientist in red / maroon coat. 128 px tall sprite. Idle has 7 frames instead of 6. |

### NPC Behavior

- **Idle:** plays idle animation for a random duration (1–3 s by default)
- **Walk:** picks a random direction, flips sprite horizontally, and walks for 1–2.5 s
- **Wander:** can be toggled globally via the "Wander: OFF/ON" debug button
- **Selected:** one NPC is always selected; debug buttons `NPC 1`, `NPC 2`, `NPC 3` switch selection
- **Command:** pressing a machine target button commands the selected NPC to walk to that machine's x-coordinate

## Background Layers

| Layer | File | Dimensions | Parallax Factor | Description |
|-------|------|------------|-------------------|-------------|
| Day 1 | `background/Day/1.png` | 576 x 324 px | 0.0 | Sky gradient, mostly white / pale cyan. |
| Day 2 | `background/Day/2.png` | 576 x 324 px | 0.1 | Distant clouds / haze in blue-grey. |
| Day 3 | `background/Day/3.png` | 576 x 324 px | 0.2 | Mid-distance hills / mountains. |
| Day 4 | `background/Day/4.png` | 576 x 324 px | 0.3 | Mostly empty layer (likely far structures). |
| Day 5 | `background/Day/5.png` | 576 x 324 px | 0.4 | Silhouette / nearest background details. |
| Overlay | `background/Overlay.png` | 1800 x 1200 px | static | Large foreground overlay with golden / blue tones, adds atmospheric haze. |

Night variants of the same 5 layers exist in `background/Night/` but are not currently loaded by the game.

## Other Screen Assets

- **Tileset:** `tileset.png` (256 x 256 px, 8x8 grid of 32x32 tiles) — industrial power-station floor, walls, pipes, and platforms.
- **Logo:** `logo.png` (500 x 108 px) — Phaser logo for the main menu.
- **Background image:** `bg.png` (1024 x 768 px) — cyan / blue gradient used in the preloader and main menu.

## Source References

- Machine spawn list: `src/game/scenes/Game.ts:107-134`
- NPC spawn list: `src/game/scenes/Game.ts:136-150`
- Debug button labels: `src/game/scenes/Game.ts:172-180`
- Asset keys and file paths: `src/game/constants/AssetKeys.ts` + `src/game/scenes/Preloader.ts`
- NPC behavior: `src/game/entities/NPC.ts`
- Level tilemap: `public/assets/level1.json`
