from PIL import Image
from pathlib import Path
import colorsys

ASSETS = Path("c:/Users/ADMIN/Documents/GitHub/template-vite-ts/public/assets")

CHARS = " .:-=+*#%@"

def dominant_colors(img: Image.Image, n=5):
    # Convert to RGB if needed
    img = img.convert("RGBA")
    # Create small version for speed
    small = img.resize((64, 64))
    pixels = list(small.getdata())
    # Quantize to get palette
    rgb_small = small.convert("RGB")
    quantized = rgb_small.quantize(colors=n, method=Image.Quantize.MEDIANCUT)
    palette = quantized.getpalette()[:n * 3]
    hex_colors = []
    for i in range(n):
        r, g, b = palette[i*3:i*3+3]
        hex_colors.append(f"#{r:02x}{g:02x}{b:02x}")
    return hex_colors

def ascii_preview(img: Image.Image, width=32):
    gray = img.convert("L")
    # Scale height to keep aspect ratio
    w, h = gray.size
    ratio = h / w
    height = max(1, int(width * ratio * 0.5))
    small = gray.resize((width, height))
    lines = []
    for y in range(height):
        line = ""
        for x in range(width):
            val = small.getpixel((x, y))
            idx = int((val / 255) * (len(CHARS) - 1))
            line += CHARS[idx]
        lines.append(line)
    return "\n".join(lines)

def describe_image(path: Path, label: str):
    img = Image.open(path)
    w, h = img.size
    mode = img.mode
    colors = dominant_colors(img)
    preview = ascii_preview(img)
    return f"""### {label}
- **File:** `{path.name}`
- **Dimensions:** {w} x {h} px
- **Mode:** {mode}
- **Dominant colors:** {', '.join(colors)}
- **ASCII preview:**
```
{preview}
```
"""

# Background
print("## Background (Day)\n")
for i in range(1, 6):
    p = ASSETS / "background" / "Day" / f"{i}.png"
    print(describe_image(p, f"Day Layer {i}"))

print("## Background Overlay\n")
print(describe_image(ASSETS / "background" / "Overlay.png", "Overlay"))

# Energy objects / machines
print("## Machines / Energy Objects\n")
print(describe_image(ASSETS / "energy_object" / "1.png", "Energy 1 / Crane (animated)"))
print(describe_image(ASSETS / "energy_object" / "2.png", "Energy 2 / Mach 1 (animated)"))
print(describe_image(ASSETS / "energy_object" / "3.png", "Energy 3 / Mach 2 (animated)"))
print(describe_image(ASSETS / "energy_object" / "1_5.png", "Machine 3 / Mach 3 (static)"))
print(describe_image(ASSETS / "energy_object" / "1_6.png", "Machine 4 / Mach 4 (static)"))
print(describe_image(ASSETS / "energy_object" / "2_oil.png", "Oil Reserve (static)"))

# NPCs
print("## NPCs (Scientists)\n")
for i in range(1, 4):
    p = ASSETS / f"Scientists_{i}" / "Idle.png"
    print(describe_image(p, f"Scientist {i} Idle spritesheet"))
    p = ASSETS / f"Scientists_{i}" / "Walk.png"
    print(describe_image(p, f"Scientist {i} Walk spritesheet"))

# Tileset and logo
print("## Other\n")
print(describe_image(ASSETS / "tileset.png", "Tileset"))
print(describe_image(ASSETS / "logo.png", "Logo"))
print(describe_image(ASSETS / "bg.png", "Background image"))
