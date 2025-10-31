import { createComplexityLimitRule } from "graphql-validation-complexity";
import depthLimit from "graphql-depth-limit";

export const depthLimitRule = depthLimit(7, {
  ignore: [
    "__typename",
    "__Schema",
    "__Field",
    "__Type",
    "__EnumValue",
    "__Directive",
  ],
});

export const complexityLimitRule = createComplexityLimitRule(1000, {
  scalarCost: 1,
  objectCost: 2,
  listFactor: 10,

  formatErrorMessage: (cost) =>
    `Query complexity of ${cost} exceeds maximum allowed complexity of 1000. ` +
    `Please simplify your query or use pagination.`,

  estimators: [
    (options) => {
      const { field } = options;

      //   expensive operations
      if (field === "search" || field === "getAllTasks") {
        return 50;
      }

      //   stats very expensive
      if (field === "getTaskStats" || field === "getUserStats") {
        return 100;
      }

      return 1; // default
    },
  ],
});

export const queryTimeout = 10000;

export const withTimeout = (resolver, timeout = queryTimeout) => {
  return async (...args) => {
    return Promise.race([
      resolver(...args),
      new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Query timeout: Operation took too long")),
          timeout
        );
      }),
    ]);
  };
};
