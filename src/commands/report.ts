import { Command } from "commander";
import fs from "fs";
import path from "path";
import { logger } from "../utils/logger.js";

export const reportCommand = new Command("report")
  .description("View results from a previous test run")
  .requiredOption("-f, --file <path>", "Path to k6 summary JSON file")
  .option("--detail", "Show detailed metrics per endpoint", false)
  .action(async (options) => {
    try {
      const filePath = path.resolve(options.file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const raw = fs.readFileSync(filePath, "utf-8");
      const summary = JSON.parse(raw);

      logger.info("=== Stress Test Report ===");
      logger.info(`Target: ${summary.root_group?.name || "unknown"}`);

      const metrics = summary.metrics || {};
      const httpReqs = metrics.http_reqs;
      const httpReqDuration = metrics.http_req_duration;
      const httpReqFailed = metrics.http_req_failed;
      const iterations = metrics.iterations;
      const vusMax = metrics.vus_max;

      console.log("\n--- Metrics ---");
      if (httpReqs) {
        console.log(`Total Requests : ${httpReqs.values?.count || 0}`);
        console.log(`Req Rate       : ${(httpReqs.values?.rate || 0).toFixed(2)}/s`);
      }
      if (httpReqDuration) {
        console.log(`Avg Duration   : ${(httpReqDuration.values?.avg || 0).toFixed(2)}ms`);
        console.log(`P95 Duration    : ${(httpReqDuration.values?.["p(95)"] || 0).toFixed(2)}ms`);
        console.log(`P99 Duration    : ${(httpReqDuration.values?.["p(99)"] || 0).toFixed(2)}ms`);
        console.log(`Max Duration   : ${(httpReqDuration.values?.max || 0).toFixed(2)}ms`);
      }
      if (httpReqFailed) {
        const failRate = httpReqFailed.values?.rate || 0;
        console.log(`Fail Rate      : ${(failRate * 100).toFixed(2)}%`);
      }
      if (iterations) {
        console.log(`Iterations     : ${iterations.values?.count || 0}`);
      }
      if (vusMax) {
        console.log(`Max VUs        : ${vusMax.values?.value || 0}`);
      }

      if (options.detail) {
        console.log("\n--- Full Metrics ---");
        console.log(JSON.stringify(metrics, null, 2));
      }
    } catch (err: any) {
      logger.error(`Report failed: ${err.message}`);
      process.exit(1);
    }
  });