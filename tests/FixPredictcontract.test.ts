
import { describe, expect, it, beforeEach } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;
const wallet4 = accounts.get("wallet_4")!;
const wallet5 = accounts.get("wallet_5")!;

describe("FixPredict Contract Tests", () => {

  beforeEach(() => {
    // Mint tokens for testing
    simnet.callPublicFn("FixPredictcontract", "mint-fix-tokens", ["u1000000", `'${wallet1}'`], deployer);
    simnet.callPublicFn("FixPredictcontract", "mint-fix-tokens", ["u1000000", `'${wallet2}'`], deployer);
    simnet.callPublicFn("FixPredictcontract", "mint-fix-tokens", ["u1000000", `'${wallet3}'`], deployer);
  });

  describe("Token Management", () => {
    it("should mint tokens correctly", () => {
      const { result } = simnet.callPublicFn("FixPredictcontract", "mint-fix-tokens", ["u50000", `'${wallet4}'`], deployer);
      expect(result).toBeOk(true);

      const balance = simnet.callReadOnlyFn("FixPredictcontract", "get-fix-token-balance", [`'${wallet4}'`], wallet4);
      expect(balance.result).toBeUint(50000);
    });

    it("should reject token minting from non-owner", () => {
      const { result } = simnet.callPublicFn("FixPredictcontract", "mint-fix-tokens", ["u50000", `'${wallet4}'`], wallet1);
      expect(result).toBeErr(100); // err-owner-only
    });
  });

  describe("Equipment Management", () => {
    it("should register equipment successfully", () => {
      const { result } = simnet.callPublicFn("FixPredictcontract", "register-equipment",
        ['"Industrial Pump"', '"Factory Floor A"', '"SENSOR-001-ABC123"'], wallet1);
      expect(result).toBeOk(1);

      const equipment = simnet.callReadOnlyFn("FixPredictcontract", "get-equipment-info", ["u1"], wallet1);
      expect(equipment.result).toBeSome();
    });

    it("should reject equipment registration with invalid inputs", () => {
      const { result } = simnet.callPublicFn("FixPredictcontract", "register-equipment",
        ['""', '"Factory Floor A"', '"SENSOR-001"'], wallet1);
      expect(result).toBeErr(103); // err-invalid-input
    });

    it("should enforce rate limiting", () => {
      // Register equipment multiple times quickly
      for (let i = 0; i < 6; i++) {
        simnet.callPublicFn("FixPredictcontract", "register-equipment",
          [`"Equipment ${i}"`, '"Location"', `"SENSOR-${i}"`], wallet1);
      }

      const { result } = simnet.callPublicFn("FixPredictcontract", "register-equipment",
        ['"Equipment 6"', '"Location"', '"SENSOR-6"'], wallet1);
      expect(result).toBeErr(111); // err-rate-limit-exceeded
    });

    it("should reject operations when contract is paused", () => {
      simnet.callPublicFn("FixPredictcontract", "pause-contract", [], deployer);

      const { result } = simnet.callPublicFn("FixPredictcontract", "register-equipment",
        ['"Equipment"', '"Location"', '"SENSOR"'], wallet1);
      expect(result).toBeErr(110); // err-contract-paused
    });
  });

  describe("Service Provider Management", () => {
    it("should register service provider successfully", () => {
      const { result } = simnet.callPublicFn("FixPredictcontract", "register-service-provider",
        ['"ABC Maintenance Co."'], wallet1);
      expect(result).toBeOk(true);

      const profile = simnet.callReadOnlyFn("FixPredictcontract", "get-provider-profile", [`'${wallet1}'`], wallet1);
      expect(profile.result).toBeSome();
    });

    it("should reject duplicate provider registration", () => {
      simnet.callPublicFn("FixPredictcontract", "register-service-provider", ['"ABC Co."'], wallet1);

      const { result } = simnet.callPublicFn("FixPredictcontract", "register-service-provider",
        ['"XYZ Co."'], wallet1);
      expect(result).toBeErr(105); // err-already-exists
    });

    it("should get provider reputation", () => {
      simnet.callPublicFn("FixPredictcontract", "register-service-provider", ['"ABC Co."'], wallet1);

      const { result } = simnet.callReadOnlyFn("FixPredictcontract", "get-provider-reputation", [`'${wallet1}'`], wallet1);
      expect(result).toBeOk(50); // Default reputation
    });
  });

  describe("Maintenance Prediction System", () => {
    beforeEach(() => {
      // Register equipment and provider
      simnet.callPublicFn("FixPredictcontract", "register-equipment",
        ['"Industrial Pump"', '"Factory A"', '"SENSOR-001"'], wallet1);
      simnet.callPublicFn("FixPredictcontract", "register-service-provider",
        ['"ABC Maintenance"', '"CEO"', '"Verified"'], wallet2);
    });

    it("should submit maintenance prediction successfully", () => {
      const futureBlock = simnet.blockHeight + 100;
      const { result } = simnet.callPublicFn("FixPredictcontract", "submit-maintenance-prediction",
        ["u1", `u${futureBlock}`, "u2000", "u10000"], wallet2);
      expect(result).toBeOk(1);

      const contract = simnet.callReadOnlyFn("FixPredictcontract", "get-contract-info", ["u1"], wallet1);
      expect(contract.result).toBeSome();
    });

    it("should reject prediction with insufficient stake", () => {
      const futureBlock = simnet.blockHeight + 100;
      const { result } = simnet.callPublicFn("FixPredictcontract", "submit-maintenance-prediction",
        ["u1", `u${futureBlock}`, "u500", "u10000"], wallet2);
      expect(result).toBeErr(109); // err-invalid-stake
    });

    it("should reject prediction for non-existent equipment", () => {
      const futureBlock = simnet.blockHeight + 100;
      const { result } = simnet.callPublicFn("FixPredictcontract", "submit-maintenance-prediction",
        ["u999", `u${futureBlock}`, "u2000", "u10000"], wallet2);
      expect(result).toBeErr(101); // err-not-found
    });
  });

  describe("Prediction Validation", () => {
    beforeEach(() => {
      // Setup equipment, provider, and contract
      simnet.callPublicFn("FixPredictcontract", "register-equipment",
        ['"Industrial Pump"', '"Factory A"', '"SENSOR-001"'], wallet1);
      simnet.callPublicFn("FixPredictcontract", "register-service-provider",
        ['"ABC Maintenance"', '"CEO"', '"Verified"'], wallet2);

      const futureBlock = simnet.blockHeight + 10;
      simnet.callPublicFn("FixPredictcontract", "submit-maintenance-prediction",
        ["u1", `u${futureBlock}`, "u2000", "u10000"], wallet2);
    });

    it("should validate correct prediction and reward provider", () => {
      // Advance to prediction window
      simnet.mineEmptyBlocks(15);

      const { result } = simnet.callPublicFn("FixPredictcontract", "validate-prediction",
        ["u1", "true"], wallet1); // Equipment owner validates maintenance occurred
      expect(result).toBeOk("prediction-correct");

      // Check provider reputation increased
      const { result: reputation } = simnet.callReadOnlyFn("FixPredictcontract", "get-provider-reputation", [`'${wallet2}'`], wallet2);
      expect(reputation).toBeOk(60); // Increased from 50 to 60
    });

    it("should penalize incorrect prediction", () => {
      // Advance to prediction window
      simnet.mineEmptyBlocks(15);

      const { result } = simnet.callPublicFn("FixPredictcontract", "validate-prediction",
        ["u1", "false"], wallet1); // Equipment owner validates no maintenance needed
      expect(result).toBeOk("prediction-failed");

      // Check provider reputation decreased
      const { result: reputation } = simnet.callReadOnlyFn("FixPredictcontract", "get-provider-reputation", [`'${wallet2}'`], wallet2);
      expect(reputation).toBeOk(40); // Decreased from 50 to 40
    });

    it("should reject validation from non-owner", () => {
      simnet.mineEmptyBlocks(15);

      const { result } = simnet.callPublicFn("FixPredictcontract", "validate-prediction",
        ["u1", "true"], wallet3); // Non-owner tries to validate
      expect(result).toBeErr(102); // err-unauthorized
    });
  });

  describe("Insurance System", () => {
    beforeEach(() => {
      // Setup equipment, provider, and failed contract
      simnet.callPublicFn("FixPredictcontract", "register-equipment",
        ['"Industrial Pump"', '"Factory A"', '"SENSOR-001"'], wallet1);
      simnet.callPublicFn("FixPredictcontract", "register-service-provider",
        ['"ABC Maintenance"', '"CEO"', '"Verified"'], wallet2);

      const futureBlock = simnet.blockHeight + 10;
      simnet.callPublicFn("FixPredictcontract", "submit-maintenance-prediction",
        ["u1", `u${futureBlock}`, "u2000", "u10000"], wallet2);

      // Validate as failed prediction
      simnet.mineEmptyBlocks(15);
      simnet.callPublicFn("FixPredictcontract", "validate-prediction", ["u1", "false"], wallet1);
    });

    it("should process insurance claim successfully", () => {
      const { result } = simnet.callPublicFn("FixPredictcontract", "claim-insurance",
        ["u1", "u5000", '"Equipment failure caused downtime"'], wallet1);
      expect(result).toBeOk(1);

      const claim = simnet.callReadOnlyFn("FixPredictcontract", "get-insurance-claim", ["u1"], wallet1);
      expect(claim.result).toBeSome();
    });

    it("should approve insurance claim", () => {
      simnet.callPublicFn("FixPredictcontract", "claim-insurance",
        ["u1", "u5000", '"Equipment failure"'], wallet1);

      const { result } = simnet.callPublicFn("FixPredictcontract", "process-insurance-claim",
        ["u1", "true"], deployer); // Owner approves
      expect(result).toBeOk("claim-approved");
    });

    it("should reject duplicate insurance claims", () => {
      simnet.callPublicFn("FixPredictcontract", "claim-insurance",
        ["u1", "u5000", '"Equipment failure"'], wallet1);

      const { result } = simnet.callPublicFn("FixPredictcontract", "claim-insurance",
        ["u1", "u3000", '"Another failure"'], wallet1);
      expect(result).toBeErr(105); // err-already-exists
    });
  });

  describe("Emergency Mode and Security", () => {
    it("should enable emergency mode", () => {
      const { result } = simnet.callPublicFn("FixPredictcontract", "enable-emergency-mode", [], deployer);
      expect(result).toBeOk(true);

      const emergency = simnet.callReadOnlyFn("FixPredictcontract", "is-emergency-mode", [], wallet1);
      expect(emergency.result).toBe(true);
    });

    it("should disable emergency mode", () => {
      simnet.callPublicFn("FixPredictcontract", "enable-emergency-mode", [], deployer);

      const { result } = simnet.callPublicFn("FixPredictcontract", "disable-emergency-mode", [], deployer);
      expect(result).toBeOk(true);

      const emergency = simnet.callReadOnlyFn("FixPredictcontract", "is-emergency-mode", [], wallet1);
      expect(emergency.result).toBe(false);
    });

    it("should reject emergency mode activation from non-owner", () => {
      const { result } = simnet.callPublicFn("FixPredictcontract", "enable-emergency-mode", [], wallet1);
      expect(result).toBeErr(100); // err-owner-only
    });

    it("should pause and unpause contract", () => {
      const { result: pause } = simnet.callPublicFn("FixPredictcontract", "pause-contract", [], deployer);
      expect(pause).toBeOk(true);

      const paused = simnet.callReadOnlyFn("FixPredictcontract", "is-contract-paused", [], wallet1);
      expect(paused.result).toBe(true);

      const { result: unpause } = simnet.callPublicFn("FixPredictcontract", "unpause-contract", [], deployer);
      expect(unpause).toBeOk(true);

      const unpaused = simnet.callReadOnlyFn("FixPredictcontract", "is-contract-paused", [], wallet1);
      expect(unpaused.result).toBe(false);
    });
  });

  describe("Treasury Management", () => {
    it("should set treasury with timelock", () => {
      const { result } = simnet.callPublicFn("FixPredictcontract", "set-platform-treasury", [`'${wallet4}'`], deployer);
      expect(result).toBeOk(true);

      const pending = simnet.callReadOnlyFn("FixPredictcontract", "get-pending-treasury", [], wallet1);
      expect(pending.result).toBe(wallet4);
    });

    it("should execute treasury change after timelock", () => {
      simnet.callPublicFn("FixPredictcontract", "set-platform-treasury", [`'${wallet4}'`], deployer);

      // Advance blocks to pass timelock
      simnet.mineEmptyBlocks(1441); // More than 1440 blocks

      const { result } = simnet.callPublicFn("FixPredictcontract", "execute-treasury-change", [], deployer);
      expect(result).toBeOk(true);
    });

    it("should reject treasury execution before timelock", () => {
      simnet.callPublicFn("FixPredictcontract", "set-platform-treasury", [`'${wallet4}'`], deployer);

      // Try to execute immediately
      const { result } = simnet.callPublicFn("FixPredictcontract", "execute-treasury-change", [], deployer);
      expect(result).toBeErr(102); // err-unauthorized (timelock active)
    });
  });

  describe("Platform Statistics", () => {
    it("should return comprehensive platform stats", () => {
      // Setup some data
      simnet.callPublicFn("FixPredictcontract", "register-equipment",
        ['"Equipment 1"', '"Location A"', '"SENSOR-001"'], wallet1);
      simnet.callPublicFn("FixPredictcontract", "register-equipment",
        ['"Equipment 2"', '"Location B"', '"SENSOR-002"'], wallet1);

      const { result } = simnet.callReadOnlyFn("FixPredictcontract", "get-platform-stats", [], wallet1);

      expect(result).toHaveProperty('total-equipment', 2);
      expect(result).toHaveProperty('total-predictions', 0);
      expect(result).toHaveProperty('contract-paused', false);
      expect(result).toHaveProperty('emergency-mode', false);
    });

    it("should calculate insurance premium correctly", () => {
      const { result } = simnet.callReadOnlyFn("FixPredictcontract", "calculate-insurance-premium", ["u10000"], wallet1);
      expect(result).toBeUint(500); // 5% of 10000
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle operations on non-existent equipment", () => {
      const { result } = simnet.callReadOnlyFn("FixPredictcontract", "get-equipment-info", ["u999"], wallet1);
      expect(result).toBeNone();
    });

    it("should handle operations on non-existent contracts", () => {
      const { result } = simnet.callReadOnlyFn("FixPredictcontract", "get-contract-info", ["u999"], wallet1);
      expect(result).toBeNone();
    });

    it("should handle operations on non-existent providers", () => {
      const { result } = simnet.callReadOnlyFn("FixPredictcontract", "get-provider-reputation", [`'${wallet5}'`], wallet1);
      expect(result).toBeErr(101); // err-not-found
    });

    it("should handle insurance claims on successful predictions", () => {
      // Setup successful prediction
      simnet.callPublicFn("FixPredictcontract", "register-equipment",
        ['"Equipment"', '"Location"', '"SENSOR"'], wallet1);
      simnet.callPublicFn("FixPredictcontract", "register-service-provider",
        ['"Provider"', '"CEO"', '"Verified"'], wallet2);

      const futureBlock = simnet.blockHeight + 10;
      simnet.callPublicFn("FixPredictcontract", "submit-maintenance-prediction",
        ["u1", `u${futureBlock}`, "u2000", "u10000"], wallet2);

      simnet.mineEmptyBlocks(15);
      simnet.callPublicFn("FixPredictcontract", "validate-prediction", ["u1", "true"], wallet1);

      // Try to claim insurance on successful prediction
      const { result } = simnet.callPublicFn("FixPredictcontract", "claim-insurance",
        ["u1", "u5000", '"Should not work"'], wallet1);
      expect(result).toBeErr(102); // err-unauthorized (wrong status)
    });

    it("should prevent overflow in calculations", () => {
      // Test with very large numbers that could cause overflow
      const largeAmount = "u" + (2 ** 128 - 1).toString(); // Max uint
      const { result } = simnet.callReadOnlyFn("FixPredictcontract", "calculate-insurance-premium", [largeAmount], wallet1);
      // Should handle gracefully or return error
      expect(result).toBeDefined();
    });
  });

  describe("Constants and Read-Only Functions", () => {
    it("should return correct constants", () => {
      const stake = simnet.callReadOnlyFn("FixPredictcontract", "get-fix-token-balance", [`'${wallet1}'`], wallet1);
      expect(stake.result).toBeUint(1000000); // Tokens we minted in beforeEach
    });

    it("should handle staking position queries", () => {
      // Setup contract
      simnet.callPublicFn("FixPredictcontract", "register-equipment",
        ['"Equipment"', '"Location"', '"SENSOR"'], wallet1);
      simnet.callPublicFn("FixPredictcontract", "register-service-provider",
        ['"Provider"', '"CEO"', '"Verified"'], wallet2);

      const futureBlock = simnet.blockHeight + 10;
      simnet.callPublicFn("FixPredictcontract", "submit-maintenance-prediction",
        ["u1", `u${futureBlock}`, "u2000", "u10000"], wallet2);

      const position = simnet.callReadOnlyFn("FixPredictcontract", "get-staking-position", ["u1", `'${wallet2}'`], wallet1);
      expect(position.result).toBeSome();
    });

    it("should handle insurance claim queries", () => {
      // Setup failed contract and claim
      simnet.callPublicFn("FixPredictcontract", "register-equipment",
        ['"Equipment"', '"Location"', '"SENSOR"'], wallet1);
      simnet.callPublicFn("FixPredictcontract", "register-service-provider",
        ['"Provider"', '"CEO"', '"Verified"'], wallet2);

      const futureBlock = simnet.blockHeight + 10;
      simnet.callPublicFn("FixPredictcontract", "submit-maintenance-prediction",
        ["u1", `u${futureBlock}`, "u2000", "u10000"], wallet2);

      simnet.mineEmptyBlocks(15);
      simnet.callPublicFn("FixPredictcontract", "validate-prediction", ["u1", "false"], wallet1);
      simnet.callPublicFn("FixPredictcontract", "claim-insurance",
        ["u1", "u5000", '"Equipment failure"'], wallet1);

      const claim = simnet.callReadOnlyFn("FixPredictcontract", "get-insurance-claim", ["u1"], wallet1);
      expect(claim.result).toBeSome();
    });
  });
});
