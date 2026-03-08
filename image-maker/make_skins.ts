import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const TILE_SIZE = 8;
const OUTPUT_SIZE = 64;
const HEAD_X = 8;
const HEAD_Y = 8;

export type MakeSkinsOptions = {
  inputPath?: string;
  outputDir?: string;
  cleanOutputDir?: boolean;
};

export type MakeSkinsResult = {
  outputDir: string;
  generatedCount: number;
  columns: number;
  rows: number;
};

export async function makeSkins(
  options: MakeSkinsOptions = {},
): Promise<MakeSkinsResult> {
  const inputPath = options.inputPath ?? join(process.cwd(), "MOTD.png");
  const outputDir = options.outputDir ?? join(process.cwd(), "tmp");
  const cleanOutputDir = options.cleanOutputDir ?? true;

  if (cleanOutputDir) {
    await rm(outputDir, { recursive: true, force: true });
  }

  await mkdir(outputDir, { recursive: true });

  const source = sharp(inputPath);
  const metadata = await source.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read image dimensions from ${inputPath}.`);
  }

  const columns = Math.floor(metadata.width / TILE_SIZE);
  const rows = Math.floor(metadata.height / TILE_SIZE);

  if (columns === 0 || rows === 0) {
    throw new Error(`${inputPath} is smaller than ${TILE_SIZE}x${TILE_SIZE}.`);
  }

  const sourceBuffer = await source.toBuffer();

  let tileId = 0;

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const tile = await sharp(sourceBuffer)
        .extract({
          left: column * TILE_SIZE,
          top: row * TILE_SIZE,
          width: TILE_SIZE,
          height: TILE_SIZE,
        })
        .png()
        .toBuffer();

      const outputPath = join(outputDir, `skin_${tileId}.png`);

      await sharp({
        create: {
          width: OUTPUT_SIZE,
          height: OUTPUT_SIZE,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([
          {
            input: tile,
            left: HEAD_X,
            top: HEAD_Y,
          },
        ])
        .png()
        .toFile(outputPath);

      tileId++;
    }
  }

  console.log(`Generated ${tileId} images in ${outputDir}`);

  return {
    outputDir,
    generatedCount: tileId,
    columns,
    rows,
  };
}

if (import.meta.main) {
  await makeSkins().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
