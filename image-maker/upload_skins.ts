import { appendFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const TMP_DIR = path.resolve("tmp");
const OUTPUT_PATH = path.resolve("uploaded_skins.txt");
const QUEUE_URL = "https://api.mineskin.org/v2/queue";
const VARIANT = "classic";
const VISIBILITY = "public";
const MAX_POLL_MINUTES = 30;
const USER_AGENT = "motd-maker/1.0 (+bun)";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const FINAL_FAILURE_STATUSES = new Set([
  "failed",
  "error",
  "cancelled",
  "canceled",
]);

type QueueSkin = {
  uuid?: string;
  url?: string;
  texture?: {
    url?: {
      skin?: string;
    };
  };
  data?: {
    texture?: {
      url?: string;
    };
  };
};

type QueueJob = {
  id?: string | number;
  status?: string;
  result?: string;
  skin?: {
    uuid?: string;
    url?: string;
    data?: {
      texture?: {
        url?: string;
      };
    };
  };
};

type QueueSubmitResponse = {
  success?: boolean;
  job?: QueueJob;
  skin?: QueueSkin;
  rateLimit?: RateLimitInfo;
  errors?: Array<{ code?: string; message?: string }>;
  error?: string;
};

type QueueJobResponse = {
  success?: boolean;
  job?: QueueJob;
  skin?: QueueSkin;
  rateLimit?: RateLimitInfo;
  errors?: Array<{ code?: string; message?: string }>;
  error?: string;
};

type RateLimitInfo = {
  next?: {
    absolute?: number;
    relative?: number;
  };
  delay?: {
    millis?: number;
    seconds?: number;
  };
};

type SubmittedJob = {
  index: number;
  fileName: string;
  submittedAt: number;
};

type SubmitResult = {
  jobId: string;
  status: string;
  skinUrl?: string;
};

type ApiRateLimiter = {
  waitForTurn: () => Promise<void>;
  updateFromRateLimit: (rateLimit?: RateLimitInfo) => void;
};

type FileResult =
  | {
      status: "pending";
    }
  | {
      status: "success";
      skinUrl: string;
    }
  | {
      status: "failed";
    };

export type UploadSkinsOptions = {
  tmpDir?: string;
  outputPath?: string;
};

export type UploadSkinsResult = {
  outputPath: string;
  submittedCount: number;
  successfulCount: number;
};

function getApiKey(): string {
  const key =
    Bun.env.MINESKIN_KEY ?? Bun.env.MINESKIN_API_KEY ?? Bun.env.API_KEY;

  if (!key) {
    throw new Error(
      "Missing MineSkin API key in .env. Add MINESKIN_KEY or MINESKIN_API_KEY.",
    );
  }

  return key;
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

function normalizeJobId(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function extractSkinUrlFromSkin(skin?: QueueSkin): string | undefined {
  if (!skin) return undefined;
  return skin.url ?? skin.data?.texture?.url ?? skin.texture?.url?.skin;
}

function extractSkinUrlFromJob(job?: QueueJob): string | undefined {
  if (!job) return undefined;
  return job.skin?.url ?? job.skin?.data?.texture?.url;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getSkinFiles(dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const info = await stat(fullPath);
    if (!info.isFile()) continue;
    if (!IMAGE_EXTENSIONS.has(path.extname(entry).toLowerCase())) continue;
    files.push(fullPath);
  }

  return files.sort((a, b) =>
    path.basename(a).localeCompare(path.basename(b), undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

async function submitQueueJob(
  filePath: string,
  apiKey: string,
  rateLimiter: ApiRateLimiter,
): Promise<SubmitResult> {
  const fileName = path.basename(filePath);
  const fileBuffer = await Bun.file(filePath).arrayBuffer();
  const mimeType = getMimeType(filePath);

  const formData = new FormData();
  formData.append("variant", VARIANT);
  formData.append("visibility", VISIBILITY);
  formData.append("name", fileName.slice(0, 20));
  formData.append("file", new File([fileBuffer], fileName, { type: mimeType }));

  await rateLimiter.waitForTurn();

  const response = await fetch(QUEUE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "MineSkin-User-Agent": USER_AGENT,
    },
    body: formData,
  });

  const bodyText = await response.text();
  const parsed = bodyText
    ? (JSON.parse(bodyText) as QueueSubmitResponse)
    : ({} as QueueSubmitResponse);
  rateLimiter.updateFromRateLimit(parsed.rateLimit);

  if (!response.ok) {
    throw new Error(
      `Queue submit failed for ${fileName} (${response.status}): ${bodyText}`,
    );
  }
  const jobId = normalizeJobId(parsed.job?.id);

  if (!jobId) {
    throw new Error(
      `Queue submit succeeded for ${fileName}, but no job id was returned: ${bodyText}`,
    );
  }

  return {
    jobId,
    status: (parsed.job?.status ?? "unknown").toLowerCase(),
    skinUrl:
      extractSkinUrlFromSkin(parsed.skin) ?? extractSkinUrlFromJob(parsed.job),
  };
}

async function fetchQueueJob(
  apiKey: string,
  jobId: string,
  rateLimiter: ApiRateLimiter,
): Promise<QueueJobResponse> {
  await rateLimiter.waitForTurn();

  const response = await fetch(`${QUEUE_URL}/${jobId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "MineSkin-User-Agent": USER_AGENT,
    },
  });

  const bodyText = await response.text();
  const parsed = bodyText
    ? (JSON.parse(bodyText) as QueueJobResponse)
    : ({} as QueueJobResponse);
  rateLimiter.updateFromRateLimit(parsed.rateLimit);

  if (!response.ok) {
    throw new Error(
      `Queue job fetch failed for ${jobId} (${response.status}): ${bodyText}`,
    );
  }

  return parsed;
}

async function appendSkinUrl(
  outputPath: string,
  skinUrl: string,
): Promise<void> {
  await appendFile(outputPath, `${skinUrl}\n`, "utf8");
}

export async function uploadSkins(
  options: UploadSkinsOptions = {},
): Promise<UploadSkinsResult> {
  const tmpDir = options.tmpDir ?? TMP_DIR;
  const outputPath = options.outputPath ?? OUTPUT_PATH;
  const apiKey = getApiKey();
  const files = await getSkinFiles(tmpDir);
  let successfulCount = 0;

  if (files.length === 0) {
    throw new Error(`No image files found in ${tmpDir}.`);
  }

  await writeFile(outputPath, "", "utf8");

  const results: FileResult[] = files.map(() => ({ status: "pending" }));
  const pendingJobs = new Map<string, SubmittedJob>();
  let nextWriteIndex = 0;
  let submissionsFinished = false;
  let flushPromise = Promise.resolve();
  let nextRequestAt = 0;
  let limiterQueue = Promise.resolve();
  let pendingJobsChangedResolve: (() => void) | undefined;

  const wakePoller = (): void => {
    pendingJobsChangedResolve?.();
    pendingJobsChangedResolve = undefined;
  };

  const waitForPendingJobsChange = (): Promise<void> => {
    if (submissionsFinished || pendingJobs.size > 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      pendingJobsChangedResolve = resolve;
    });
  };

  const rateLimiter: ApiRateLimiter = {
    waitForTurn: async () => {
      const previous = limiterQueue;
      let release = () => {};

      limiterQueue = new Promise<void>((resolve) => {
        release = resolve;
      });

      await previous;

      const delayMs = Math.max(0, nextRequestAt - Date.now());
      if (delayMs > 0) {
        await sleep(delayMs);
      }

      release();
    },
    updateFromRateLimit: (rateLimit) => {
      const absolute = rateLimit?.next?.absolute;
      const relative = rateLimit?.next?.relative;
      const delayMillis = rateLimit?.delay?.millis;
      const delaySeconds = rateLimit?.delay?.seconds;

      const relativeTarget =
        typeof relative === "number" && Number.isFinite(relative)
          ? Date.now() + Math.max(0, relative)
          : 0;
      const millisTarget =
        typeof delayMillis === "number" && Number.isFinite(delayMillis)
          ? Date.now() + Math.max(0, delayMillis)
          : 0;
      const secondsTarget =
        typeof delaySeconds === "number" && Number.isFinite(delaySeconds)
          ? Date.now() + Math.max(0, delaySeconds * 1_000)
          : 0;
      const absoluteTarget =
        typeof absolute === "number" && Number.isFinite(absolute)
          ? absolute
          : 0;

      nextRequestAt = Math.max(
        nextRequestAt,
        absoluteTarget,
        relativeTarget,
        millisTarget,
        secondsTarget,
      );
    },
  };

  const flushOrderedResults = async (): Promise<void> => {
    while (nextWriteIndex < results.length) {
      const result = results[nextWriteIndex];
      if (!result || result.status === "pending") {
        break;
      }

      if (result.status === "success") {
        await appendSkinUrl(outputPath, result.skinUrl);
        successfulCount += 1;
      }

      nextWriteIndex += 1;
    }
  };

  const scheduleFlush = (): Promise<void> => {
    flushPromise = flushPromise.then(flushOrderedResults);
    return flushPromise;
  };

  const pollQueuedJobs = async (): Promise<void> => {
    while (!submissionsFinished || pendingJobs.size > 0) {
      if (pendingJobs.size === 0) {
        await waitForPendingJobsChange();
        continue;
      }

      for (const [jobId, submitted] of [...pendingJobs.entries()]) {
        if (Date.now() - submitted.submittedAt > MAX_POLL_MINUTES * 60_000) {
          pendingJobs.delete(jobId);
          results[submitted.index] = { status: "failed" };
          console.warn(
            `Stopped waiting for ${submitted.fileName} after ${MAX_POLL_MINUTES} minutes.`,
          );
          await scheduleFlush();
          continue;
        }

        let jobResponse: QueueJobResponse;

        try {
          jobResponse = await fetchQueueJob(apiKey, jobId, rateLimiter);
        } catch (error) {
          console.warn(`Unable to fetch status for job ${jobId}:`, error);
          continue;
        }

        const status = (jobResponse.job?.status ?? "unknown").toLowerCase();
        const skinUrl =
          extractSkinUrlFromSkin(jobResponse.skin) ??
          extractSkinUrlFromJob(jobResponse.job);

        if (skinUrl) {
          pendingJobs.delete(jobId);
          results[submitted.index] = {
            status: "success",
            skinUrl,
          };
          console.log(`Completed ${submitted.fileName}: ${skinUrl}`);
          await scheduleFlush();
          continue;
        }

        if (FINAL_FAILURE_STATUSES.has(status)) {
          pendingJobs.delete(jobId);
          results[submitted.index] = { status: "failed" };
          console.log(`Job failed for ${submitted.fileName}: ${status}`);
          await scheduleFlush();
        }
      }

      if (!submissionsFinished || pendingJobs.size > 0) {
        console.log(`Waiting for ${pendingJobs.size} queued jobs...`);
      }
    }
  };

  const pollPromise = pollQueuedJobs();

  for (let index = 0; index < files.length; index += 1) {
    const filePath = files[index];
    if (!filePath) continue;

    const fileName = path.basename(filePath);
    console.log(`[submit ${index + 1}/${files.length}] ${fileName}`);

    try {
      const submit = await submitQueueJob(filePath, apiKey, rateLimiter);

      if (submit.skinUrl) {
        results[index] = {
          status: "success",
          skinUrl: submit.skinUrl,
        };
        console.log(`Completed immediately ${fileName}: ${submit.skinUrl}`);
        await scheduleFlush();
      } else if (FINAL_FAILURE_STATUSES.has(submit.status)) {
        results[index] = { status: "failed" };
        console.log(`Job failed immediately for ${fileName}: ${submit.status}`);
        await scheduleFlush();
      } else {
        pendingJobs.set(submit.jobId, {
          index,
          fileName,
          submittedAt: Date.now(),
        });
        console.log(`Queued ${fileName} -> job ${submit.jobId}`);
        wakePoller();
      }
    } catch (error) {
      results[index] = { status: "failed" };
      console.error(`Failed to queue ${fileName}:`, error);
      await scheduleFlush();
    }
  }

  submissionsFinished = true;
  wakePoller();
  await pollPromise;
  await scheduleFlush();

  console.log(`Done. Results saved to ${outputPath}`);

  return {
    outputPath,
    submittedCount: files.length,
    successfulCount,
  };
}

if (import.meta.main) {
  await uploadSkins().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
