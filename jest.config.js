module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^marked$": "<rootDir>/node_modules/marked/lib/marked.umd.js",
  },
};
