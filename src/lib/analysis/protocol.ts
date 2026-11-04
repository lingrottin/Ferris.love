/** No credentials or mutable branch names are persisted in queue messages. */
export type AnalysisMessage = { version: 1; jobId: string };

export type AnalysisInput = {
  jobId: string;
  owner: string;
  repo: string;
  commitSha: string;
  token?: string;
};

export type AnalysisData = {
  lorc: number;
  counts: Record<string, number>;
  parsedFiles: number;
  skippedFiles: number;
  snapshotBytes: number;
};

export type AnalysisOutput = {
  version: 1;
  jobId: string;
  commitSha: string;
  data: AnalysisData | null;
  error: string | null;
  retryable: boolean;
};

export function parseOutput(
  text: string,
  input: AnalysisInput,
): AnalysisOutput {
  const value = JSON.parse(text) as AnalysisOutput;
  if (
    !value ||
    value.version !== 1 ||
    value.jobId !== input.jobId ||
    value.commitSha !== input.commitSha ||
    typeof value.retryable !== "boolean"
  ) {
    throw new Error("Matthew returned an invalid task identity");
  }
  if (value.error !== null) {
    if (typeof value.error !== "string" || value.data !== null)
      throw new Error("Invalid Matthew error");
  } else {
    if (value.retryable)
      throw new Error("Successful Matthew result cannot be retryable");
    const data = value.data;
    if (
      !data?.counts ||
      typeof data.counts !== "object" ||
      Array.isArray(data.counts)
    )
      throw new Error("Missing Matthew result");
    for (const number of [
      data.lorc,
      data.parsedFiles,
      data.skippedFiles,
      data.snapshotBytes,
      ...Object.values(data.counts),
    ]) {
      if (!Number.isSafeInteger(number) || number < 0)
        throw new Error("Invalid Matthew count");
    }
  }
  return value;
}
