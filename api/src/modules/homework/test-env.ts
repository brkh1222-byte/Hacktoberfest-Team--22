// Imported first by the tests: models must bind to a throwaway database, and
// generation must use the built-in sample, never a real provider.
process.env.MONGO_URL = process.env.HOMEWORK_TEST_MONGO_URL ?? "mongodb://127.0.0.1:27017/homework_test";
process.env.ANTHROPIC_API_KEY = "";

if (!/test/i.test(new URL(process.env.MONGO_URL).pathname)) {
  throw new Error("Tests drop their database; HOMEWORK_TEST_MONGO_URL must name a *test* database");
}
