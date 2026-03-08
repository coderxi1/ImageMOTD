import { parseArgs } from "node:util";
import path from "node:path";
import { makeSkins } from "./make_skins.ts";
import { uploadSkins } from "./upload_skins.ts";

type CliOptions = {
  imagePath: string;
  outputDir: string;
  resultPath: string;
};

function printUsage(): void {
  console.log(
    [
      "Usage: bun run index.ts --image <file>",
      "",
      "Options:",
      "  --image <file>   Source image to split into 8x8 tiles.",
      "  --output <dir>   Directory for generated skin PNGs. Default: ./tmp",
      "  --help           Show this message.",
    ].join("\n"),
  );
}

function getDefaultResultPath(imagePath: string): string {
  const parsed = path.parse(imagePath);
  return path.join(parsed.dir, `${parsed.name}.txt`);
}

function parseCliOptions(argv: string[]): CliOptions {
  const { values } = parseArgs({
    args: argv,
    options: {
      image: {
        type: "string",
      },
      output: {
        type: "string",
      },
      help: {
        type: "boolean",
        short: "h",
      },
    },
    strict: true,
    allowPositionals: false,
  });

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  if (!values.image) {
    throw new Error("Missing required --image argument. Use --help for usage.");
  }

  const imagePath = path.resolve(values.image);

  return {
    imagePath,
    outputDir: path.resolve(values.output ?? "tmp"),
    resultPath: getDefaultResultPath(imagePath),
  };
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));

  console.log(`Generating skins from ${options.imagePath}...`);
  const generated = await makeSkins({
    inputPath: options.imagePath,
    outputDir: options.outputDir,
    cleanOutputDir: true,
  });

  console.log(
    `Uploading ${generated.generatedCount} generated skins from ${generated.outputDir}...`,
  );
  const upload = await uploadSkins({
    tmpDir: generated.outputDir,
    outputPath: options.resultPath,
  });

  console.log(
    `Wrote ${upload.successfulCount} skin URLs to ${upload.outputPath}`,
  );
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
