const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GigEscrow Edge Cases", function () {
  let GigEscrow, escrow, owner, client, freelancer, other;

  beforeEach(async function () {
    [owner, client, freelancer, other] = await ethers.getSigners();
    GigEscrow = await ethers.getContractFactory("GigEscrow");
    escrow = await GigEscrow.deploy();
    await escrow.waitForDeployment();
  });

  async function createContract(overrides = {}) {
    const descs = overrides.descs || ["M1", "M2"];
    const amounts = overrides.amounts || [ethers.parseEther("1"), ethers.parseEther("1")];
    const total = overrides.total || ethers.parseEther("2");
    const deadline = overrides.deadline || (Math.floor(Date.now() / 1000) + 86400);
    const title = overrides.title || "Test Project";
    const termsCID = overrides.termsCID || "QmTestCID";
    const creator = overrides.creator || client;
    const useFreelancer = overrides.freelancer || freelancer;
    const freelancerAddr = useFreelancer.target || useFreelancer.address;

    const tx = await escrow.connect(creator).createContract(
      freelancerAddr, title, termsCID, total, deadline, descs, amounts
    );
    const receipt = await tx.wait();
    const contractId = 1;

    return { contractId, receipt };
  }

  async function createAndFundContract(overrides = {}) {
    const { contractId } = await createContract(overrides);
    const total = overrides.total || ethers.parseEther("2");
    await escrow.connect(client).fundContract(contractId, { value: total });
    return contractId;
  }

  async function submitAndGetApproved() {
    const contractId = await createAndFundContract();
    await escrow.connect(freelancer).submitMilestone(contractId, 0, "QmDeliverableCID");
    return contractId;
  }

  // ============================================================
  // PHASE 3: Authorization & Access Control
  // ============================================================
  describe("Authorization & Access Control", function () {
    it("should reject non-client from cancelling contract", async function () {
      const { contractId } = await createContract();
      await expect(
        escrow.connect(freelancer).cancelContract(contractId)
      ).to.be.revertedWith("Only client");
      await expect(
        escrow.connect(other).cancelContract(contractId)
      ).to.be.revertedWith("Only client");
    });

    it("should reject unauthorized user from raising dispute", async function () {
      const contractId = await createAndFundContract();
      await expect(
        escrow.connect(other).raiseDispute(contractId)
      ).to.be.revertedWith("Not a contract party or owner");
    });

    it("should allow owner to raise dispute as contract party", async function () {
      const contractId = await createAndFundContract();
      await expect(
        escrow.connect(owner).raiseDispute(contractId)
      ).to.emit(escrow, "DisputeRaised");
    });

    it("should reject funding non-existent contract", async function () {
      await expect(
        escrow.connect(client).fundContract(99, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Contract does not exist");
    });

    it("should reject submitting on non-existent contract", async function () {
      await expect(
        escrow.connect(freelancer).submitMilestone(99, 0, "QmCID")
      ).to.be.revertedWith("Contract does not exist");
    });

    it("should reject approving on non-existent contract", async function () {
      await expect(
        escrow.connect(client).approveMilestone(99, 0)
      ).to.be.revertedWith("Contract does not exist");
    });

    it("should reject raising dispute on non-existent contract", async function () {
      await expect(
        escrow.connect(client).raiseDispute(99)
      ).to.be.revertedWith("Contract does not exist");
    });

    it("should reject cancelling non-existent contract", async function () {
      await expect(
        escrow.connect(client).cancelContract(99)
      ).to.be.revertedWith("Contract does not exist");
    });

    it("should reject resolving dispute on non-existent contract", async function () {
      await expect(
        escrow.connect(owner).resolveDispute(99, true)
      ).to.be.revertedWith("Contract does not exist");
    });

    it("should reject querying non-existent contract details", async function () {
      await expect(
        escrow.getContractDetails(99)
      ).to.be.revertedWith("Contract does not exist");
    });
  });

  // ============================================================
  // PHASE 4: State Transition Validation
  // ============================================================
  describe("State Transition Validation", function () {
    it("should reject milestone approval before funding", async function () {
      const { contractId } = await createContract();
      await expect(
        escrow.connect(client).approveMilestone(contractId, 0)
      ).to.be.revertedWith("Contract not in progress");
    });

    it("should reject milestone submission before funding", async function () {
      const { contractId } = await createContract();
      await expect(
        escrow.connect(freelancer).submitMilestone(contractId, 0, "QmCID")
      ).to.be.revertedWith("Contract not in progress");
    });

    it("should reject double-funding", async function () {
      const contractId = await createAndFundContract();
      await expect(
        escrow.connect(client).fundContract(contractId, { value: ethers.parseEther("2") })
      ).to.be.revertedWith("Contract not in created state");
    });

    it("should reject approving already-approved milestone", async function () {
      const contractId = await submitAndGetApproved();
      await escrow.connect(client).approveMilestone(contractId, 0);
      await expect(
        escrow.connect(client).approveMilestone(contractId, 0)
      ).to.be.revertedWith("Milestone not submitted");
    });

    it("should reject submitting milestone on completed contract", async function () {
      const contractId = await createAndFundContract();
      await escrow.connect(freelancer).submitMilestone(contractId, 0, "QmCID");
      await escrow.connect(client).approveMilestone(contractId, 0);
      await escrow.connect(freelancer).submitMilestone(contractId, 1, "QmCID2");
      await escrow.connect(client).approveMilestone(contractId, 1);
      await expect(
        escrow.connect(freelancer).submitMilestone(contractId, 0, "QmCID3")
      ).to.be.revertedWith("Contract not in progress");
    });

    it("should reject cancelling after funding", async function () {
      const contractId = await createAndFundContract();
      await expect(
        escrow.connect(client).cancelContract(contractId)
      ).to.be.revertedWith("Can only cancel before funding");
    });

    it("should reject cancelling completed contract", async function () {
      const contractId = await createAndFundContract();
      await escrow.connect(freelancer).submitMilestone(contractId, 0, "QmCID");
      await escrow.connect(client).approveMilestone(contractId, 0);
      await escrow.connect(freelancer).submitMilestone(contractId, 1, "QmCID2");
      await escrow.connect(client).approveMilestone(contractId, 1);
      await expect(
        escrow.connect(client).cancelContract(contractId)
      ).to.be.revertedWith("Can only cancel before funding");
    });

    it("should reject resolving dispute when no dispute exists", async function () {
      const contractId = await createAndFundContract();
      await expect(
        escrow.connect(owner).resolveDispute(contractId, true)
      ).to.be.revertedWith("Contract not in dispute");
    });

    it("should reject raising dispute on completed contract", async function () {
      const contractId = await createAndFundContract();
      await escrow.connect(freelancer).submitMilestone(contractId, 0, "QmCID");
      await escrow.connect(client).approveMilestone(contractId, 0);
      await escrow.connect(freelancer).submitMilestone(contractId, 1, "QmCID2");
      await escrow.connect(client).approveMilestone(contractId, 1);
      await expect(
        escrow.connect(client).raiseDispute(contractId)
      ).to.be.revertedWith("Cannot dispute in current state");
    });

    it("should reject raising dispute on cancelled contract", async function () {
      const { contractId } = await createContract();
      await escrow.connect(client).cancelContract(contractId);
      await expect(
        escrow.connect(client).raiseDispute(contractId)
      ).to.be.revertedWith("Cannot dispute in current state");
    });

    it("should reject rejecting non-submitted milestone", async function () {
      const contractId = await createAndFundContract();
      await expect(
        escrow.connect(client).rejectMilestone(contractId, 0)
      ).to.be.revertedWith("Milestone not submitted");
    });
  });

  // ============================================================
  // PHASE 5: Reentrancy & Security
  // ============================================================
  describe("Reentrancy & Security", function () {
    it("should have nonReentrant on approveMilestone", async function () {
      const MaliciousReceiver = await ethers.getContractFactory("MaliciousReceiver");
      const malicious = await MaliciousReceiver.deploy(await escrow.getAddress());
      await malicious.waitForDeployment();

      const contractId = await createAndFundContract({ freelancer: malicious });
      await malicious.submitMilestone(contractId, 0, "QmCID");
      await malicious.setAttack(contractId, 0, true);
      await expect(
        malicious.tryReenterApprove()
      ).to.be.reverted;
    });

    it("should have nonReentrant on resolveDispute", async function () {
      const MaliciousReceiver = await ethers.getContractFactory("MaliciousReceiver");
      const malicious = await MaliciousReceiver.deploy(await escrow.getAddress());
      await malicious.waitForDeployment();

      const contractId = await createAndFundContract({ freelancer: malicious });
      await escrow.connect(client).raiseDispute(contractId);
      await malicious.setAttack(contractId, 0, true);
      await expect(
        malicious.tryReenterResolve(true)
      ).to.be.reverted;
    });

    it("should have nonReentrant on cancelContract", async function () {
      const MaliciousReceiver = await ethers.getContractFactory("MaliciousReceiver");
      const malicious = await MaliciousReceiver.deploy(await escrow.getAddress());
      await malicious.waitForDeployment();

      const { contractId } = await createContract({ freelancer: malicious });
      await malicious.setAttack(contractId, 0, true);
      await expect(
        malicious.tryReenterCancel()
      ).to.be.reverted;

      const status = (await escrow.getContractDetails(contractId)).status;
      expect(status).to.equal(0);
    });

    it("should use transfer() which prevents reentrancy via gas limitation", async function () {
      const MaliciousReceiver = await ethers.getContractFactory("MaliciousReceiver");
      const malicious = await MaliciousReceiver.deploy(await escrow.getAddress());
      await malicious.waitForDeployment();

      const contractId = await createAndFundContract({ freelancer: malicious });
      await malicious.submitMilestone(contractId, 0, "QmCID");
      await malicious.setAttack(contractId, 0, true);

      await expect(
        escrow.connect(client).approveMilestone(contractId, 0)
      ).to.be.reverted;

      expect(await malicious.reentrancyAttempts()).to.equal(0);
    });
  });

  // ============================================================
  // PHASE 6: Value & Arithmetic Edge Cases
  // ============================================================
  describe("Value & Arithmetic Edge Cases", function () {
    it("should create contract with zero-value milestones", async function () {
      const descs = ["Free Milestone"];
      const amounts = [0];
      await expect(
        escrow.connect(client).createContract(
          freelancer.address, "Zero Value", "QmCID", 0, 0, descs, amounts
        )
      ).to.emit(escrow, "ContractCreated");
      const details = await escrow.getContractDetails(1);
      expect(details.totalAmount).to.equal(0);
    });

    it("should calculate platform fee correctly (2.5%)", async function () {
      const totalAmount = ethers.parseEther("10");
      const descs = ["M1"];
      const amounts = [totalAmount];
      await escrow.connect(client).createContract(
        freelancer.address, "Fee Test", "QmCID", totalAmount,
        Math.floor(Date.now() / 1000) + 86400, descs, amounts
      );
      await escrow.connect(client).fundContract(1, { value: totalAmount });
      await escrow.connect(freelancer).submitMilestone(1, 0, "QmCID");
      const freelancerBalanceBefore = await ethers.provider.getBalance(freelancer.address);
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      await escrow.connect(client).approveMilestone(1, 0);

      const expectedFee = totalAmount * 250n / 10000n;
      const expectedPayout = totalAmount - expectedFee;
      const freelancerBalanceAfter = await ethers.provider.getBalance(freelancer.address);
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      expect(freelancerBalanceAfter - freelancerBalanceBefore).to.equal(expectedPayout);
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(expectedFee);
    });

    it("should handle small wei-level values correctly", async function () {
      const totalAmount = 1n;
      const descs = ["M1"];
      const amounts = [totalAmount];
      await escrow.connect(client).createContract(
        freelancer.address, "Wei Test", "QmCID", totalAmount, 0, descs, amounts
      );
      await escrow.connect(client).fundContract(1, { value: totalAmount });
      await escrow.connect(freelancer).submitMilestone(1, 0, "QmCID");
      await escrow.connect(client).approveMilestone(1, 0);
      const ms = await escrow.getMilestoneDetails(1, 0);
      expect(ms.status).to.equal(3);
    });

    it("should handle exact platform fee boundary (10000 BPS boundary)", async function () {
      const totalAmount = ethers.parseEther("400");
      const descs = ["M1"];
      const amounts = [totalAmount];
      await escrow.connect(client).createContract(
        freelancer.address, "Fee Boundary", "QmCID", totalAmount, 0, descs, amounts
      );
      await escrow.connect(client).fundContract(1, { value: totalAmount });
      await escrow.connect(freelancer).submitMilestone(1, 0, "QmCID");
      const freelancerBalanceBefore = await ethers.provider.getBalance(freelancer.address);

      await escrow.connect(client).approveMilestone(1, 0);

      const expectedFee = totalAmount * 250n / 10000n;
      const expectedPayout = totalAmount - expectedFee;
      const freelancerBalanceAfter = await ethers.provider.getBalance(freelancer.address);
      expect(freelancerBalanceAfter - freelancerBalanceBefore).to.equal(expectedPayout);
    });
  });

  // ============================================================
  // PHASE 7: Failure Recovery
  // ============================================================
  describe("Failure Recovery", function () {
    it("should reject invalid milestone index on submit", async function () {
      const contractId = await createAndFundContract();
      await expect(
        escrow.connect(freelancer).submitMilestone(contractId, 99, "QmCID")
      ).to.be.revertedWith("Invalid milestone index");
    });

    it("should reject invalid milestone index on approve", async function () {
      const contractId = await createAndFundContract();
      await expect(
        escrow.connect(client).approveMilestone(contractId, 99)
      ).to.be.reverted;
    });

    it("should reject invalid milestone index on getMilestoneDetails", async function () {
      const { contractId } = await createContract();
      await expect(
        escrow.getMilestoneDetails(contractId, 99)
      ).to.be.revertedWith("Invalid milestone");
    });

    it("should create contract with empty title", async function () {
      await expect(
        escrow.connect(client).createContract(
          freelancer.address, "", "QmCID", 0, 0, ["M1"], [0]
        )
      ).to.emit(escrow, "ContractCreated");
    });

    it("should create contract with empty terms CID", async function () {
      await expect(
        escrow.connect(client).createContract(
          freelancer.address, "Test", "", 0, 0, ["M1"], [0]
        )
      ).to.emit(escrow, "ContractCreated");
    });

    it("should reject submit on milestone that is not in Funded state", async function () {
      const contractId = await createAndFundContract();
      await escrow.connect(freelancer).submitMilestone(contractId, 0, "QmCID");
      await expect(
        escrow.connect(freelancer).submitMilestone(contractId, 0, "QmCID2")
      ).to.be.revertedWith("Milestone not ready for submission");
    });
  });

  // ============================================================
  // PHASE 8: Event Validation
  // ============================================================
  describe("Event Validation", function () {
    it("should emit MilestoneAdded for each milestone", async function () {
      const descs = ["M1", "M2", "M3"];
      const amounts = [ethers.parseEther("1"), ethers.parseEther("1"), ethers.parseEther("1")];
      await expect(
        escrow.connect(client).createContract(
          freelancer.address, "Multi Milestone", "QmCID",
          ethers.parseEther("3"), 0, descs, amounts
        )
      ).to.emit(escrow, "MilestoneAdded").withArgs(1, 0)
       .and.to.emit(escrow, "MilestoneAdded").withArgs(1, 1)
       .and.to.emit(escrow, "MilestoneAdded").withArgs(1, 2);
    });

    it("should emit ContractCreated with correct parameters", async function () {
      await expect(
        escrow.connect(client).createContract(
          freelancer.address, "Test", "QmCID", ethers.parseEther("5"), 0, ["M1"], [ethers.parseEther("5")]
        )
      ).to.emit(escrow, "ContractCreated")
       .withArgs(1, client.address, freelancer.address, ethers.parseEther("5"));
    });

    it("should emit MilestoneSubmitted with correct parameters", async function () {
      const contractId = await createAndFundContract();
      await expect(
        escrow.connect(freelancer).submitMilestone(contractId, 0, "QmUniqueCID")
      ).to.emit(escrow, "MilestoneSubmitted")
       .withArgs(contractId, 0, "QmUniqueCID");
    });

    it("should emit MilestoneApproved with correct payout amount", async function () {
      const contractId = await createAndFundContract();
      await escrow.connect(freelancer).submitMilestone(contractId, 0, "QmCID");
      const milestoneAmount = ethers.parseEther("1");
      const expectedFee = milestoneAmount * 250n / 10000n;
      const expectedPayout = milestoneAmount - expectedFee;

      await expect(
        escrow.connect(client).approveMilestone(contractId, 0)
      ).to.emit(escrow, "MilestoneApproved")
       .withArgs(contractId, 0, expectedPayout);
    });

    it("should emit MilestoneRejected with correct contractId and index", async function () {
      const contractId = await createAndFundContract();
      await escrow.connect(freelancer).submitMilestone(contractId, 0, "QmCID");
      await expect(
        escrow.connect(client).rejectMilestone(contractId, 0)
      ).to.emit(escrow, "MilestoneRejected")
       .withArgs(contractId, 0);
    });

    it("should emit ContractCompleted after all milestones approved", async function () {
      const descs = ["M1", "M2"];
      const amounts = [ethers.parseEther("1"), ethers.parseEther("1")];
      await escrow.connect(client).createContract(
        freelancer.address, "Complete Test", "QmCID",
        ethers.parseEther("2"), Math.floor(Date.now() / 1000) + 86400, descs, amounts
      );
      await escrow.connect(client).fundContract(1, { value: ethers.parseEther("2") });
      await escrow.connect(freelancer).submitMilestone(1, 0, "QmCID");
      await escrow.connect(client).approveMilestone(1, 0);
      await escrow.connect(freelancer).submitMilestone(1, 1, "QmCID2");
      await expect(
        escrow.connect(client).approveMilestone(1, 1)
      ).to.emit(escrow, "ContractCompleted").withArgs(1);
    });

    it("should emit ContractCancelled with correct contractId", async function () {
      const { contractId } = await createContract();
      await expect(
        escrow.connect(client).cancelContract(contractId)
      ).to.emit(escrow, "ContractCancelled").withArgs(contractId);
    });

    it("should emit DisputeRaised with correct raisedBy address", async function () {
      const contractId = await createAndFundContract();
      await expect(
        escrow.connect(freelancer).raiseDispute(contractId)
      ).to.emit(escrow, "DisputeRaised").withArgs(contractId, freelancer.address);
    });

    it("should emit DisputeResolved with correct winner address", async function () {
      const contractId = await createAndFundContract();
      await escrow.connect(freelancer).raiseDispute(contractId);
      await expect(
        escrow.connect(owner).resolveDispute(contractId, true)
      ).to.emit(escrow, "DisputeResolved").withArgs(contractId, freelancer.address);
    });
  });

  // ============================================================
  // PHASE 9: getContractBalance validation
  // ============================================================
  describe("Contract Balance Queries", function () {
    it("should return correct contract balance after funding", async function () {
      const totalAmount = ethers.parseEther("5");
      const descs = ["M1"];
      const amounts = [totalAmount];
      await escrow.connect(client).createContract(
        freelancer.address, "Balance Test", "QmCID", totalAmount, 0, descs, amounts
      );
      await escrow.connect(client).fundContract(1, { value: totalAmount });
      const balance = await escrow.getContractBalance(1);
      expect(balance).to.equal(totalAmount);
    });

    it("should return zero balance for unfunded contract", async function () {
      const { contractId } = await createContract();
      const balance = await escrow.getContractBalance(contractId);
      expect(balance).to.equal(0);
    });
  });
});
