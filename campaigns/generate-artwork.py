#!/usr/bin/env python3
"""
Campaign Artwork Generator
Batch generates artwork for campaign scenarios using AI image generation APIs

Supports: DALL-E 3, Stable Diffusion, and others

Usage:
    python3 generate-artwork.py --service dalle --campaign arcane-conspiracy
    python3 generate-artwork.py --service stable --campaign void-expansion
    python3 generate-artwork.py --service dalle --scenario 1 --campaign arcane
"""

import json
import os
import sys
import argparse
from pathlib import Path
from typing import Optional, Dict, List
import time


class ArtworkGenerator:
    """Base class for artwork generation"""

    def __init__(self, output_dir: str = "campaign-artwork"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.prompts = self._load_prompts()

    def _load_prompts(self) -> Dict:
        """Load prompts from JSON file"""
        prompt_file = Path("campaign-art-prompts.json")
        if not prompt_file.exists():
            print("Error: campaign-art-prompts.json not found")
            sys.exit(1)

        with open(prompt_file) as f:
            return json.load(f)

    def generate_campaign(self, campaign: str):
        """Generate artwork for entire campaign"""
        if campaign not in self.prompts:
            print(f"Campaign not found: {campaign}")
            sys.exit(1)

        campaign_data = self.prompts[campaign]
        scenarios = campaign_data['scenarios']

        print(f"\n{'='*70}")
        print(f"🎨 Generating {campaign_data['campaign']} Artwork")
        print(f"{'='*70}")
        print(f"Theme: {campaign_data['theme']}")
        print(f"Scenarios: {len(scenarios)}\n")

        for scenario in scenarios:
            print(f"[{scenario['number']}/15] {scenario['name']}...", end=" ")
            sys.stdout.flush()

            success = self.generate_scenario(campaign, scenario)
            print("✓" if success else "✗")

        print(f"\n{'='*70}")
        print("✅ Generation complete!")
        print(f"{'='*70}\n")

    def generate_scenario(self, campaign: str, scenario: Dict) -> bool:
        """Generate artwork for a single scenario"""
        raise NotImplementedError

    def get_output_path(self, campaign: str, scenario: Dict) -> Path:
        """Get output file path for scenario"""
        campaign_slug = campaign.replace("_", "-")
        scenario_num = scenario['number']
        scenario_slug = scenario['name'].lower().replace(' ', '-').replace('(', '').replace(')', '')

        filename = f"{campaign_slug}-scenario-{scenario_num:02d}-{scenario_slug}.png"

        campaign_dir = self.output_dir / campaign_slug.split('-')[0]
        campaign_dir.mkdir(parents=True, exist_ok=True)

        return campaign_dir / filename


class DALLEGenerator(ArtworkGenerator):
    """DALL-E 3 Artwork Generator"""

    def __init__(self, api_key: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)

        if not api_key:
            api_key = os.getenv('OPENAI_API_KEY')

        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment")

        self.api_key = api_key
        self._check_openai_available()

    def _check_openai_available(self):
        """Check if OpenAI package is available"""
        try:
            import openai
            self.openai = openai
            self.client = openai.OpenAI(api_key=self.api_key)
        except ImportError:
            print("Error: openai package not installed")
            print("Install with: pip install openai")
            sys.exit(1)

    def generate_scenario(self, campaign: str, scenario: Dict) -> bool:
        """Generate artwork using DALL-E 3"""
        try:
            prompt = self._build_prompt(scenario)

            response = self.client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1024",
                quality="hd",
                n=1
            )

            image_url = response.data[0].url

            # Download the image
            import urllib.request
            output_path = self.get_output_path(campaign, scenario)
            urllib.request.urlretrieve(image_url, output_path)

            return True

        except Exception as e:
            print(f"\nError generating {scenario['name']}: {e}")
            return False

    def _build_prompt(self, scenario: Dict) -> str:
        """Build enhanced prompt for DALL-E"""
        base = "High quality game floor art, overhead/top-down view, 1024x1024px, "
        base += "detailed game design, professional game artwork, hexagonal game floor: "
        return base + scenario['prompt']


class StableGenerator(ArtworkGenerator):
    """Stable Diffusion Artwork Generator"""

    def __init__(self, api_key: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)

        if not api_key:
            api_key = os.getenv('STABILITY_API_KEY')

        if not api_key:
            raise ValueError("STABILITY_API_KEY not found in environment")

        self.api_key = api_key
        self.api_host = "https://api.stability.ai"
        self._check_requests_available()

    def _check_requests_available(self):
        """Check if requests package is available"""
        try:
            import requests
            self.requests = requests
        except ImportError:
            print("Error: requests package not installed")
            print("Install with: pip install requests")
            sys.exit(1)

    def generate_scenario(self, campaign: str, scenario: Dict) -> bool:
        """Generate artwork using Stable Diffusion"""
        try:
            prompt = self._build_prompt(scenario)

            response = self.requests.post(
                f"{self.api_host}/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}"
                },
                json={
                    "text_prompts": [{"text": prompt, "weight": 1.0}],
                    "cfg_scale": 8,
                    "height": 1024,
                    "width": 1024,
                    "samples": 1,
                    "steps": 50
                }
            )

            if response.status_code != 200:
                print(f"\nAPI Error: {response.status_code}")
                return False

            data = response.json()

            if "artifacts" not in data or len(data["artifacts"]) == 0:
                print("\nNo image generated")
                return False

            # Save image
            import base64
            output_path = self.get_output_path(campaign, scenario)

            image_data = base64.b64decode(data["artifacts"][0]["base64"])
            with open(output_path, "wb") as f:
                f.write(image_data)

            return True

        except Exception as e:
            print(f"\nError generating {scenario['name']}: {e}")
            return False

    def _build_prompt(self, scenario: Dict) -> str:
        """Build enhanced prompt for Stable Diffusion"""
        base = "High quality game floor art, top-down overhead view, 1024x1024, "
        base += "detailed game map design, hexagonal grid game floor, "
        return base + scenario['prompt']


class MockGenerator(ArtworkGenerator):
    """Mock generator for testing without API keys"""

    def generate_scenario(self, campaign: str, scenario: Dict) -> bool:
        """Create a placeholder image file"""
        try:
            output_path = self.get_output_path(campaign, scenario)

            # Create a simple placeholder PNG (1x1 pixel)
            png_data = (
                b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00'
                b'\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx'
                b'\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\r\xf9\xe8\x00\x00'
                b'\x00\x00IEND\xaeB`\x82'
            )

            with open(output_path, 'wb') as f:
                f.write(png_data)

            return True
        except Exception as e:
            print(f"\nError: {e}")
            return False


def main():
    parser = argparse.ArgumentParser(
        description='Generate campaign artwork using AI image generation'
    )
    parser.add_argument(
        '--service',
        choices=['dalle', 'stable', 'mock'],
        default='dalle',
        help='Image generation service to use'
    )
    parser.add_argument(
        '--campaign',
        choices=['arcane-conspiracy', 'arcane', 'void-expansion', 'void'],
        required=True,
        help='Campaign to generate artwork for'
    )
    parser.add_argument(
        '--scenario',
        type=int,
        help='Generate specific scenario only (1-15)'
    )
    parser.add_argument(
        '--output',
        default='campaign-artwork',
        help='Output directory for generated artwork'
    )
    parser.add_argument(
        '--api-key',
        help='API key (or set environment variable)'
    )

    args = parser.parse_args()

    # Normalize campaign name
    campaign_map = {
        'arcane': 'arcane_conspiracy',
        'arcane-conspiracy': 'arcane_conspiracy',
        'void': 'void_expansion',
        'void-expansion': 'void_expansion'
    }
    campaign = campaign_map.get(args.campaign, args.campaign)

    # Create generator
    try:
        if args.service == 'dalle':
            generator = DALLEGenerator(api_key=args.api_key, output_dir=args.output)
        elif args.service == 'stable':
            generator = StableGenerator(api_key=args.api_key, output_dir=args.output)
        else:  # mock
            generator = MockGenerator(output_dir=args.output)
            print("⚠️  Using MOCK generator (placeholder images only)")

        if args.scenario:
            # Generate single scenario
            if campaign not in generator.prompts:
                print(f"Campaign not found: {campaign}")
                sys.exit(1)

            scenarios = generator.prompts[campaign]['scenarios']
            scenario = next((s for s in scenarios if s['number'] == args.scenario), None)

            if not scenario:
                print(f"Scenario {args.scenario} not found")
                sys.exit(1)

            print(f"Generating {scenario['name']}...")
            generator.generate_scenario(campaign, scenario)
        else:
            # Generate entire campaign
            generator.generate_campaign(campaign)

    except ValueError as e:
        print(f"Error: {e}")
        print("\nSet environment variables:")
        print("  export OPENAI_API_KEY=sk-...")
        print("  export STABILITY_API_KEY=sk-...")
        sys.exit(1)


if __name__ == '__main__':
    main()
