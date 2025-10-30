import { getCacheKey, cachePrefix, cacheTTL } from "./config/cache-config.js";

const page = 1;
const limit = 10;

const filter = {
  status: "PENDING",
  priority: "MEDIUM",
};

console.log(
  getCacheKey(
    cachePrefix.tasksList,
    cachePrefix.search,
    JSON.stringify(filter),
    `page:${page}`,
    `limit:${limit}`
  )
);
