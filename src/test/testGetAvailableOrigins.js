import { getAvailableOrigins } from "../services/fortexBatch.js";

/**
 * Test for getAvailableOrigins function
 */
async function testGetAvailableOrigins() {
  console.log("\n" + "=".repeat(80));
  console.log("Testing getAvailableOrigins()");
  console.log("=".repeat(80) + "\n");

  try {
    // Call the function
    const origins = await getAvailableOrigins();

    // Validate the result
    if (!Array.isArray(origins)) {
      throw new Error("Expected origins to be an array");
    }

    console.log(`✓ Found ${origins.length} origins\n`);

    // Display each origin with details
    origins.forEach((origin, index) => {
      console.log(`${index + 1}. Origin: ${origin.origin}`);
      console.log(`   Companies Count: ${origin.companiesCount}`);
      console.log(`   Companies Array Length: ${origin.companies?.length || 0}`);

      // Validate structure
      if (!origin.origin) {
        throw new Error(`Origin ${index + 1} missing 'origin' property`);
      }
      if (typeof origin.companiesCount !== 'number') {
        throw new Error(`Origin ${index + 1} has invalid 'companiesCount'`);
      }
      if (!Array.isArray(origin.companies)) {
        throw new Error(`Origin ${index + 1} missing 'companies' array`);
      }

      // Show first 3 companies as sample
      if (origin.companies.length > 0) {
        console.log(`   Sample companies (first 3):`);
        origin.companies.slice(0, 3).forEach((company, i) => {
          console.log(`     - ${company.name} (ID: ${company.id})`);
        });
        if (origin.companies.length > 3) {
          console.log(`     ... and ${origin.companies.length - 3} more`);
        }
      }
      console.log("");
    });

    console.log("=".repeat(80));
    console.log("✓ TEST PASSED: getAvailableOrigins() works correctly");
    console.log("=".repeat(80) + "\n");

    return origins;
  } catch (error) {
    console.error("=".repeat(80));
    console.error("✗ TEST FAILED");
    console.error("=".repeat(80));
    console.error("Error:", error.message);
    console.error("\nStack trace:");
    console.error(error.stack);
    console.error("=".repeat(80) + "\n");
    throw error;
  }
}

// Run the test
testGetAvailableOrigins()
  .then(() => {
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
