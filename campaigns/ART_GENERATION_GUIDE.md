# Campaign Artwork Generation Guide

This guide explains how to generate the campaign artwork for the 30 scenarios (15 Arcane Conspiracy + 15 Void Expansion).

## Overview

You have two options for generating artwork:

1. **Manual Generation**: Copy-paste prompts into an AI image generator
2. **Automated Generation**: Use a script with API keys to batch generate

## Option 1: Manual Generation (Recommended for Testing)

### Best Platforms

#### DALL-E 3 (via ChatGPT Plus or API)
- **Pros**: High quality, good at detailed descriptions, handles fade effects well
- **Cost**: $0.04-0.20 per image depending on size
- **Quality**: 1024x1024px native support
- **Website**: https://openai.com/dall-e-3

**Steps:**
1. Open ChatGPT or DALL-E directly
2. Copy a prompt from `CAMPAIGN_ART_PROMPTS.md`
3. Add context: "Generate an overhead/top-down view of a game map floor based on this description:"
4. Paste the prompt
5. Request: "1024x1024px, PNG format"
6. Save the generated image with the scenario filename

#### Midjourney
- **Pros**: Excellent at atmosphere and style, very detailed
- **Cost**: $10-120/month subscription
- **Quality**: Excellent detail and composition
- **Website**: https://www.midjourney.com

**Steps:**
1. Join Midjourney Discord
2. Use `/imagine` command in a channel
3. Prefix the prompt with: `/imagine top-down dungeon floor --ar 1:1 --q 2`
4. Paste the scenario prompt
5. Upscale the best result to 1024x1024px
6. Download as PNG

#### Stable Diffusion (Local or RunwayML)
- **Pros**: Free local option, fully customizable
- **Cost**: Free (local) or $8-15/month (hosted)
- **Quality**: Good with proper prompting
- **Website**: https://stability.ai or https://runwayml.com

**Steps:**
1. Set up Stable Diffusion locally or use RunwayML
2. Add prefix: "overhead view, top-down perspective, game floor art"
3. Paste the scenario prompt
4. Recommended settings:
   - Resolution: 1024x1024
   - Sampling steps: 25-50
   - Guidance scale: 7-11
   - Seed: Random or fixed for consistency

#### Adobe Firefly (via Adobe Express)
- **Pros**: Integrated with Adobe ecosystem
- **Cost**: Included with Creative Cloud or pay per use
- **Quality**: Good consistency
- **Website**: https://www.adobe.com/products/firefly

**Steps:**
1. Visit Adobe Express or Firefly directly
2. Use generative fill with the prompt
3. Request 1024x1024px output
4. Download as PNG

## Option 2: Automated Batch Generation

### Using Python with APIs

Create a `.env` file with your API keys:

```
OPENAI_API_KEY=sk-...
STABILITY_API_KEY=sk-...
```

Run the batch generation script:

```bash
python3 generate-artwork.py --service dalle --campaign arcane-conspiracy
python3 generate-artwork.py --service stable --campaign void-expansion
```

### Services Supported

- **dalle**: DALL-E 3 via OpenAI API
- **stable**: Stable Diffusion via Stability AI
- **midjourney**: Midjourney via API (if available)

## Prompt Engineering Tips

### Consistency

For a cohesive set of images, maintain these elements across all prompts:

1. **Perspective**: Always emphasize "top-down view" or "overhead"
2. **Scale Reference**: Mention "hexagonal game grid" if you want hex patterns visible
3. **Quality**: Add "high quality, detailed, game art style"
4. **Format**: Always request 1024x1024px square format

### Recommended Additions to Prompts

Add these to the beginning of any prompt:

```
High quality game floor art, overhead/top-down view, 1024x1024px,
detailed game design, professional game artwork, [scenario-specific description]:
```

### Terrain Color Consistency

The prompts already include specific color guidance:

- **Green areas**: Bright, walkable, well-lit
- **Orange areas**: Medium lighting, fading to shadow
- **Red areas**: Dark, fading to black/void, clearly impassable

Make sure the generated images maintain this visual hierarchy.

## Workflow Recommendation

### Phase 1: Generate Samples (1-2 hours)
1. Generate 2-3 test images per scenario
2. Compare results from different platforms
3. Decide on preferred service/style

### Phase 2: Generate Clean Set (4-6 hours)
1. Generate all 30 scenarios with chosen service
2. Organize by campaign and sequence number
3. Verify filenames match the naming convention:
   - Arcane: `arcane-conspiracy-scenario-XX-name.png`
   - Void: `void-expansion-scenario-XX-name.png`

### Phase 3: Quality Control (1-2 hours)
1. Check each image for:
   - Correct top-down perspective
   - Proper fade effects on difficult/obstacle areas
   - Clear terrain differentiation
   - 1024x1024px resolution
   - PNG format
2. Re-generate any that don't meet standards

## File Organization

Once generated, organize artwork as follows:

```
campaigns/
├── campaign-artwork/
│   ├── arcane-conspiracy/
│   │   ├── arcane-conspiracy-scenario-01-village-under-siege.png
│   │   ├── arcane-conspiracy-scenario-02-cursed-crypt.png
│   │   └── ... (13 more files)
│   └── void-expansion/
│       ├── void-expansion-scenario-01-colony-ship-breach.png
│       ├── void-expansion-scenario-02-station-alpha-defense.png
│       └── ... (13 more files)
```

## Integration with Game

Once artwork is generated:

1. **Web Display**: Add images to scenario detail pages
2. **Game Client**: Reference images in game asset manifest
3. **Marketing**: Use images for campaign previews
4. **Documentation**: Include images in campaign guides

## Cost Estimates

### By Service (30 images)

| Service | Cost | Quality | Speed | Best For |
|---------|------|---------|-------|----------|
| DALL-E 3 | $5-6 | Excellent | Fast | Detailed prompts, high quality |
| Midjourney | $10-30 (sub) | Excellent | Medium | Atmosphere, style, batch work |
| Stable Diffusion | $2-3 (hosted) | Good | Medium | Budget-conscious, custom models |
| Local Stable | Free | Good | Slow | Free option, full control |

## Troubleshooting

### Images Not Showing Fade Effects
- Add "fade to shadow" explicitly in custom instruction
- Use higher quality/detail settings
- Try different service or model

### Poor Top-Down Perspective
- Add "bird's eye view" to beginning of prompt
- Specify "overhead angle"
- Try services known for spatial reasoning (DALL-E, Midjourney)

### Color Palette Not Matching
- Add specific hex colors to prompt
- Reference the color scheme section of art guides
- Use consistent color vocabulary (emerald green, burnt orange, etc.)

### Inconsistency Between Scenarios
- Use a consistent "style" prefix across all prompts
- Generate same campaign scenarios with same service
- Use fixed seed if available to maintain style

## Next Steps

1. Choose your preferred image generation service
2. Start with 1-2 test images to verify quality
3. Adjust prompt wording based on results
4. Generate full set of 30 images
5. Commit artwork files to repository
6. Update game engine with image references

---

## Resources

- [DALL-E 3 Documentation](https://platform.openai.com/docs/guides/vision)
- [Midjourney User Guide](https://docs.midjourney.com)
- [Stable Diffusion API](https://stability.ai/api)
- [Adobe Firefly](https://www.adobe.com/products/firefly)

