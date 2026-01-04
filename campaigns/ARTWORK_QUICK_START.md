# Campaign Artwork Generation - Quick Start

Generate the 30 scenario artwork images for both Hexhaven campaigns in ~15 minutes.

## Option A: Quick Manual Generation (Easiest)

### Step 1: Get Prompts
Open `CAMPAIGN_ART_PROMPTS.md` in this directory.

### Step 2: Choose Platform
Pick one:
- **DALL-E 3** (Recommended): https://openai.com/dall-e-3
- **Midjourney**: https://www.midjourney.com
- **Adobe Firefly**: https://www.adobe.com/products/firefly

### Step 3: Generate Each Scenario
For each scenario (30 total):

1. Copy the prompt from `CAMPAIGN_ART_PROMPTS.md`
2. Paste into your chosen platform
3. For DALL-E/Firefly: Request "1024x1024px PNG"
4. For Midjourney: Add `--ar 1:1` to the command
5. Download the image
6. Save as: `arcane-conspiracy-scenario-01-village-under-siege.png` (or appropriate name)

### Step 4: Organize
Move all images to folders:
```
campaign-artwork/
├── arcane-conspiracy/
│   ├── arcane-conspiracy-scenario-01-*.png
│   └── ... (14 more)
└── void-expansion/
    ├── void-expansion-scenario-01-*.png
    └── ... (14 more)
```

## Option B: Batch Automated Generation (If You Have API Keys)

### Requirements
- OpenAI API account OR Stability AI account
- Python 3.7+
- API key with credits

### Step 1: Set Up API Key

```bash
# For DALL-E 3
export OPENAI_API_KEY="sk-..."

# OR for Stable Diffusion
export STABILITY_API_KEY="sk-..."
```

### Step 2: Install Dependencies

For DALL-E:
```bash
pip install openai
```

For Stable Diffusion:
```bash
pip install requests
```

### Step 3: Generate Artwork

Generate Arcane Conspiracy:
```bash
python3 generate-artwork.py --service dalle --campaign arcane-conspiracy
```

Generate Void Expansion:
```bash
python3 generate-artwork.py --service dalle --campaign void-expansion
```

Or use Stable Diffusion:
```bash
python3 generate-artwork.py --service stable --campaign void-expansion
```

### Step 4: Check Results
Images appear in `campaign-artwork/` directory automatically organized by campaign.

## Troubleshooting

### "API key not found"
Set your environment variable:
```bash
export OPENAI_API_KEY="sk-..."
export STABILITY_API_KEY="sk-..."
```

### "Module not found"
Install required package:
```bash
pip install openai requests
```

### Image doesn't match expectations
- Make sure "top-down view" is emphasized
- Try different service (DALL-E is usually best for detailed prompts)
- Add more specific color descriptions to the prompt

## Cost Estimates

| Service | Cost per Image | Total (30) |
|---------|---|---|
| DALL-E 3 | $0.04-0.20 | $1.20-6 |
| Stable Diffusion | $0.01-0.10 | $0.30-3 |
| Midjourney | $0.10-0.50 | $3-15 |

## Files in This Directory

- **CAMPAIGN_ART_PROMPTS.md** - All 30 prompts formatted for copy-paste
- **generate-artwork.py** - Automated batch generation script
- **ART_GENERATION_GUIDE.md** - Detailed guide with tips and tricks
- **campaign-art-prompts.json** - Machine-readable prompt database

## Next Steps

Once artwork is generated:

1. Verify all 30 images (15 per campaign)
2. Commit to git: `git add campaign-artwork/`
3. Update game engine to reference images
4. Add to web pages for scenario previews

---

**Questions?** See `ART_GENERATION_GUIDE.md` for detailed information.
