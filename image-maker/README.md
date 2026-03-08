# image-maker

Generates MineSkin-compatible skin PNGs from an input image and then uploads them through the MineSkin queue API.

## Install

```bash
bun install
```

## Usage

Add your MineSkin API key to `.env` as `MINESKIN_KEY` or `MINESKIN_API_KEY`, then run:

```bash
bun run index.ts --image wave.png
```

Optional flags:

```bash
bun run index.ts --image wave.png --output tmp
```

The command will:

1. Split the input image into 8x8 tiles.
2. Generate one 64x64 skin PNG per tile in `tmp`.
3. Upload every generated skin.
4. Write each successful skin URL to `wave.txt`, one URL per line, using the source image name.
