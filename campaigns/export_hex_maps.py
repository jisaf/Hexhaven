#!/usr/bin/env python3
"""
Hexhaven Hex Map Exporter
Generates clean and detailed hex map visualizations as both SVG and PNG files.
SVG files use terrain-specific colors (green, orange, red).
PNG files are generated at 1024x1024px resolution using ffmpeg.
"""

import json
import math
import os
import subprocess
from pathlib import Path


class HexMapExporter:
    """Export hex maps from scenario JSON to SVG files"""

    # Configuration
    HEX_SIZE = 50  # pixels
    MARGIN = 30

    # Colors
    COLOR_NORMAL = "#90EE90"  # Light green - normal terrain
    COLOR_DIFFICULT = "#FFA500"  # Orange - difficult terrain
    COLOR_OBSTACLE = "#8B0000"  # Dark red - obstacles
    COLOR_GRID = "#00AA00"  # Bright green for outline
    COLOR_MONSTER = "#FF4444"
    COLOR_PLAYER = "#4444FF"
    COLOR_OBJECTIVE = "#FFD700"
    COLOR_TREASURE = "#FFD700"

    def __init__(self, hex_size=50, clean_mode=False):
        self.hex_size = hex_size
        self.clean_mode = clean_mode  # If True, export only green hexes (no legend)

    def axial_to_pixel(self, q, r, center_x, center_y):
        """Convert axial coordinates to pixel coordinates"""
        x = self.hex_size * (3/2 * q)
        y = self.hex_size * (math.sqrt(3)/2 * q + math.sqrt(3) * r)
        return center_x + x, center_y + y

    def get_hex_corners(self, x, y, size):
        """Get the 6 corner points of a hexagon"""
        corners = []
        for i in range(6):
            angle = math.pi / 3 * i
            cx = x + size * math.cos(angle)
            cy = y + size * math.sin(angle)
            corners.append((cx, cy))
        return corners

    def get_bounds(self, hexes):
        """Calculate bounding box for hex grid"""
        if not hexes:
            return 0, 0, 0, 0

        min_q = min(h['q'] for h in hexes)
        max_q = max(h['q'] for h in hexes)
        min_r = min(h['r'] for h in hexes)
        max_r = max(h['r'] for h in hexes)

        return min_q, max_q, min_r, max_r

    def export_scenario(self, scenario, output_dir, campaign_name):
        """Export a single scenario to SVG (clean or full mode)"""

        hexes = scenario['mapHexes']
        if not hexes:
            print(f"  ⚠️  Skipping {scenario['name']} - no hexes")
            return

        min_q, max_q, min_r, max_r = self.get_bounds(hexes)

        # Calculate canvas size
        width = (max_q - min_q + 2) * self.hex_size * 1.5 + self.MARGIN * 2
        height = (max_r - min_r + 2) * self.hex_size * math.sqrt(3) + self.MARGIN * 2

        center_x = self.MARGIN - min_q * self.hex_size * 1.5 + self.hex_size * 0.75
        center_y = self.MARGIN - min_r * self.hex_size * math.sqrt(3) + self.hex_size * math.sqrt(3) / 2

        # Start SVG
        svg_lines = [
            f'<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">',
            '<defs>',
            '<style>',
            f'.hex-normal {{ fill: {self.COLOR_NORMAL}; stroke: {self.COLOR_GRID}; stroke-width: 1; }}',
            f'.hex-difficult {{ fill: {self.COLOR_DIFFICULT}; stroke: {self.COLOR_GRID}; stroke-width: 1; }}',
            f'.hex-obstacle {{ fill: {self.COLOR_OBSTACLE}; stroke: #FF0000; stroke-width: 1.5; }}',
            f'.label {{ font-size: 10px; font-family: Arial; fill: #333; text-anchor: middle; }}',
            f'.coord {{ font-size: 8px; font-family: Arial; fill: #666; text-anchor: middle; }}',
            '</style>',
            '</defs>',
            f'<rect width="{width}" height="{height}" fill="white"/>',
            '<g id="map">',
        ]

        # Create hex map with terrain-specific colors
        hex_dict = {(h['q'], h['r']): h for h in hexes}

        for (q, r), hex_data in hex_dict.items():
            x, y = self.axial_to_pixel(q, r, center_x, center_y)
            corners = self.get_hex_corners(x, y, self.hex_size)
            corner_str = ' '.join(f'{cx},{cy}' for cx, cy in corners)

            # Use terrain-specific colors
            terrain = hex_data['terrain']
            hex_class = f'hex-{terrain}'
            svg_lines.append(f'<polygon points="{corner_str}" class="{hex_class}"/>')

            # Only show coordinates if not in clean mode
            if not self.clean_mode:
                svg_lines.append(f'<text x="{x}" y="{y+3}" class="coord">{q},{r}</text>')

        svg_lines.append('</g>')

        # Only add decorative elements if not in clean mode
        if not self.clean_mode:
            # Add starting positions
            svg_lines.append('<g id="starting-positions">')
            for start_pos in scenario.get('startingPositions', []):
                x, y = self.axial_to_pixel(start_pos['q'], start_pos['r'], center_x, center_y)
                svg_lines.append(f'<circle cx="{x}" cy="{y}" r="8" fill="{self.COLOR_PLAYER}" opacity="0.8"/>')
                svg_lines.append(f'<text x="{x}" y="{y+20}" class="label">P{start_pos["player"]+1}</text>')
            svg_lines.append('</g>')

            # Add monsters
            svg_lines.append('<g id="monsters">')
            for group in scenario.get('monsterGroups', []):
                for i, pos in enumerate(group['positions']):
                    x, y = self.axial_to_pixel(pos['q'], pos['r'], center_x, center_y)
                    size = 6 if not group['elite'][i] else 8
                    svg_lines.append(f'<circle cx="{x}" cy="{y}" r="{size}" fill="{self.COLOR_MONSTER}" opacity="0.7"/>')
            svg_lines.append('</g>')

            # Add objectives
            svg_lines.append('<g id="objectives">')
            for obj in scenario.get('objectives', []):
                if 'hexes' in obj:
                    for hex_pos in obj['hexes']:
                        x, y = self.axial_to_pixel(hex_pos['q'], hex_pos['r'], center_x, center_y)
                        svg_lines.append(f'<rect x="{x-6}" y="{y-6}" width="12" height="12" fill="none" stroke="{self.COLOR_OBJECTIVE}" stroke-width="2"/>')
            svg_lines.append('</g>')

            # Add treasures
            svg_lines.append('<g id="treasures">')
            for treasure in scenario.get('treasures', []):
                pos = treasure['position']
                x, y = self.axial_to_pixel(pos['q'], pos['r'], center_x, center_y)
                svg_lines.append(f'<circle cx="{x}" cy="{y}" r="5" fill="{self.COLOR_TREASURE}" opacity="0.8"/>')
            svg_lines.append('</g>')

            # Add legend
            svg_lines.append('<g id="legend">')
            svg_lines.append(f'<rect x="10" y="10" width="200" height="120" fill="white" stroke="#999" stroke-width="1" opacity="0.9"/>')
            svg_lines.append(f'<text x="20" y="30" class="label" style="text-anchor: start; font-weight: bold;">{scenario["name"]}</text>')
            svg_lines.append(f'<text x="20" y="45" class="label" style="text-anchor: start; font-size: 9px;">Difficulty: {scenario.get("difficulty", "?")}</text>')
            svg_lines.append(f'<rect x="15" y="52" width="12" height="12" fill="{self.COLOR_NORMAL}" stroke="{self.COLOR_GRID}"/>')
            svg_lines.append(f'<text x="35" y="62" class="label" style="text-anchor: start; font-size: 9px;">Normal</text>')
            svg_lines.append(f'<rect x="15" y="72" width="12" height="12" fill="{self.COLOR_DIFFICULT}" stroke="{self.COLOR_GRID}"/>')
            svg_lines.append(f'<text x="35" y="82" class="label" style="text-anchor: start; font-size: 9px;">Difficult</text>')
            svg_lines.append(f'<rect x="15" y="92" width="12" height="12" fill="{self.COLOR_OBSTACLE}" stroke="#FF0000"/>')
            svg_lines.append(f'<text x="35" y="102" class="label" style="text-anchor: start; font-size: 9px;">Obstacle</text>')
            svg_lines.append('</g>')

        svg_lines.append('</svg>')

        # Write SVG file
        scenario_num = scenario['sequence']
        name_slug = scenario['name'].lower().replace(' ', '-').replace(':', '')
        suffix = '-clean' if self.clean_mode else ''
        filename = f"{campaign_name}-scenario-{scenario_num:02d}-{name_slug}{suffix}.svg"
        filepath = os.path.join(output_dir, filename)

        with open(filepath, 'w') as f:
            f.write('\n'.join(svg_lines))

        return filepath

    def export_campaign(self, json_file, output_dir):
        """Export all scenarios from a campaign JSON file"""

        with open(json_file, 'r') as f:
            data = json.load(f)

        campaign_name = data['campaign']
        os.makedirs(output_dir, exist_ok=True)

        print(f"\n📍 Exporting {campaign_name} campaign:")

        for scenario in data['scenarios']:
            filepath = self.export_scenario(scenario, output_dir, campaign_name)
            if filepath:
                print(f"  ✓ {scenario['name']}")

        print(f"✅ Campaign export complete!\n")

    def convert_svg_to_png(self, svg_file, png_file, size=1024):
        """Convert SVG to PNG using ffmpeg"""

        try:
            cmd = [
                'ffmpeg',
                '-i', svg_file,
                '-vf', f'scale={size}:{size}',
                '-y',  # Overwrite output file
                png_file
            ]

            result = subprocess.run(cmd, capture_output=True, timeout=10)
            return result.returncode == 0
        except Exception as e:
            return False


def convert_directory_to_png(svg_dir, png_dir, size=1024):
    """Convert all SVG files in a directory to PNG at specified size"""

    svg_dir = Path(svg_dir)
    png_dir = Path(png_dir)
    png_dir.mkdir(parents=True, exist_ok=True)

    svg_files = list(svg_dir.glob('**/*.svg'))
    if not svg_files:
        return 0

    successful = 0
    for svg_file in svg_files:
        # Create corresponding PNG path with same directory structure
        rel_path = svg_file.relative_to(svg_dir)
        png_file = png_dir / rel_path.with_suffix('.png')
        png_file.parent.mkdir(parents=True, exist_ok=True)

        try:
            cmd = [
                'ffmpeg',
                '-i', str(svg_file),
                '-vf', f'scale={size}:{size}:force_original_aspect_ratio=decrease,pad={size}:{size}:(ow-iw)/2:(oh-ih)/2:white',
                '-y',
                str(png_file)
            ]
            result = subprocess.run(cmd, capture_output=True, timeout=15)
            if result.returncode == 0:
                successful += 1
                print(f"    ✓ {svg_file.name}")
        except Exception as e:
            print(f"    ✗ {svg_file.name} - {e}")

    return successful


def main():
    """Main entry point"""

    campaigns_dir = Path('/home/ubuntu/hexhaven/campaigns')

    print("\n" + "="*70)
    print("🗺️  HEXHAVEN HEX MAP EXPORTER")
    print("="*70)
    print("Using scenario designer export logic (pure green hexes #00ff00)")
    print()

    # Export clean maps (no legend, no coordinates - matching scenario designer)
    print("📊 Generating CLEAN hex maps (green hexes only, no legend)...")
    clean_exporter = HexMapExporter(clean_mode=True)

    maps_dir = campaigns_dir / 'hex-maps-clean'
    clean_exporter.export_campaign(
        campaigns_dir / 'arcane-conspiracy-scenarios.json',
        maps_dir / 'arcane-conspiracy'
    )

    clean_exporter.export_campaign(
        campaigns_dir / 'void-expansion-scenarios.json',
        maps_dir / 'void-expansion'
    )

    # Export detailed maps (with legend, coordinates, game elements)
    print("📊 Generating DETAILED hex maps (with coordinates, legend, elements)...")
    full_exporter = HexMapExporter(clean_mode=False)

    maps_dir_full = campaigns_dir / 'hex-maps'
    full_exporter.export_campaign(
        campaigns_dir / 'arcane-conspiracy-scenarios.json',
        maps_dir_full / 'arcane-conspiracy'
    )

    full_exporter.export_campaign(
        campaigns_dir / 'void-expansion-scenarios.json',
        maps_dir_full / 'void-expansion'
    )

    # Convert SVGs to PNG at 1024x1024
    print("\n📸 Converting SVG files to PNG (1024x1024px)...")
    print("\n  Converting CLEAN maps...")
    clean_png_count = convert_directory_to_png(
        maps_dir / 'arcane-conspiracy',
        campaigns_dir / 'hex-maps-clean-png' / 'arcane-conspiracy'
    )
    clean_png_count += convert_directory_to_png(
        maps_dir / 'void-expansion',
        campaigns_dir / 'hex-maps-clean-png' / 'void-expansion'
    )

    print("\n  Converting DETAILED maps...")
    detailed_png_count = convert_directory_to_png(
        maps_dir_full / 'arcane-conspiracy',
        campaigns_dir / 'hex-maps-png' / 'arcane-conspiracy'
    )
    detailed_png_count += convert_directory_to_png(
        maps_dir_full / 'void-expansion',
        campaigns_dir / 'hex-maps-png' / 'void-expansion'
    )

    print("\n" + "="*70)
    print("✅ ALL HEX MAPS EXPORTED (SVG + PNG)")
    print("="*70)
    print("\n📁 Files generated:\n")
    print("CLEAN MAPS (SVG):")
    print("  Location: hex-maps-clean/")
    print("  - arcane-conspiracy/*-clean.svg (15 maps)")
    print("  - void-expansion/*-clean.svg (15 maps)")
    print("  Content: Terrain-colored hexes, no decorations\n")

    print("CLEAN MAPS (PNG 1024x1024px):")
    print("  Location: hex-maps-clean-png/")
    print(f"  - arcane-conspiracy/*.png ({clean_png_count // 2} maps)")
    print(f"  - void-expansion/*.png ({clean_png_count // 2} maps)\n")

    print("DETAILED MAPS (SVG):")
    print("  Location: hex-maps/")
    print("  - arcane-conspiracy/*.svg (15 maps)")
    print("  - void-expansion/*.svg (15 maps)")
    print("  Content: Hexes + coordinates + legend + monsters + objectives\n")

    print("DETAILED MAPS (PNG 1024x1024px):")
    print("  Location: hex-maps-png/")
    print(f"  - arcane-conspiracy/*.png ({detailed_png_count // 2} maps)")
    print(f"  - void-expansion/*.png ({detailed_png_count // 2} maps)")
    print("\n" + "="*70)
    print("\n")


if __name__ == '__main__':
    main()
