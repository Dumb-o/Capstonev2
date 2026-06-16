const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GigEscrow", function () {
  let GigEscrow, escrow, owner, client, freelancer, other;

  beforeEach(async function () {
    [owner, client, freelancer, other] = await ethers.getSigners();
    GigEscrow = await ethers.getContractFactory("GigEscrow");
    escrow = await GigEscrow.deploy();
    await escrow.waitForDeployment();
  });

  describe("Contract Creation", function () {
    it("should create a contract with milestones", async function () {
      const descs = ["Milestone 1", "Milestone 2"];
      const amounts = [ethers.parseEther("1"), ethers.parseEther("1")];

      await expect(
        escrow.connect(client).createContract(
          freelancer.address,
          "Test Project",
          "QmTestCID",
          ethers.parseEther("2"),
          Math.floor(Date.now() / 1000) + 86400,
          descs,
          amounts
        )
      ).to.emit(escrow, "ContractCreated");

      const contractDetails = await escrow.getContractDetails(1);
      expect(contractDetails.client).to.equal(client.address);
      expect(contractDetails.freelancer).to.equal(freelancer.address);
      expect(contractDetails.milestoneCount).to.equal(2);
    });

    it("should reject zero-address freelancer", async function () {
      await expect(
        escrow.connect(client).createContract(
          ethers.ZeroAddress,
          "Test",
          "QmCID",
          0,
          0,
          ["M1"],
          [0]
        )
      ).to.be.revertedWith("Invalid freelancer address");
    });

    it("should reject self-contracting", async function () {
      await expect(
        escrow.connect(client).createContract(
          client.address,
          "Test",
          "QmCID",
          0,
          0,
          ["M1"],
          [0]
        )
      ).to.be.revertedWith("Cannot contract yourself");
    });

    it("should require at least 1 milestone", async function () {
      await expect(
        escrow.connect(client).createContract(
          freelancer.address,
          "Test",
          "QmCID",
          0,
          0,
          [],
          []
        )
      ).to.be.revertedWith("Need at least 1 milestone");
    });

    it("should reject mismatched milestone arrays", async function () {
      await expect(
        escrow.connect(client).createContract(
          freelancer.address,
          "Test",
          "QmCID",
          0,
          0,
          ["M1"],
          [ethers.parseEther("1"), ethers.parseEther("2")]
        )
      ).to.be.revertedWith("Arrays length mismatch");
    });

    it("should reject mismatched total milestone amounts", async function () {
      await expect(
        escrow.connect(client).createContract(
          freelancer.address,
          "Test",
          "QmCID",
          ethers.parseEther("3"),
          0,
          ["M1", "M2"],
          [ethers.parseEther("1"), ethers.parseEther("1")]
        )
      ).to.be.revertedWith("Milestone amounts must sum to total");
    });
  });

  describe("Contract Funding", function () {
    beforeEach(async function () {
      await escrow.connect(client).createContract(
        freelancer.address,
        "Test",
        "QmCID",
        ethers.parseEther("2"),
        Math.floor(Date.now() / 1000) + 86400,
        ["M1", "M2"],
        [ethers.parseEther("1"), ethers.parseEther("1")]
      );
    });

    it("should fund a contract", async function () {
      await escrow.connect(client).fundContract(1, { value: ethers.parseEther("2") });

      const details = await escrow.getContractDetails(1);
      expect(details.status).to.equal(1); // InProgress
    });

    it("should reject funding from non-client", async function () {
      await expect(
        escrow.connect(freelancer).fundContract(1, { value: ethers.parseEther("2") })
      ).to.be.revertedWith("Only client");
    });

    it("should reject incorrect funding amount", async function () {
      await expect(
        escrow.connect(client).fundContract(1, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Incorrect funding amount");
    });
  });

  describe("Milestone Lifecycle", function () {
    beforeEach(async function () {
      await escrow.connect(client).createContract(
        freelancer.address,
        "Test",
        "QmCID",
        ethers.parseEther("2"),
        Math.floor(Date.now() / 1000) + 86400,
        ["M1", "M2"],
        [ethers.parseEther("1"), ethers.parseEther("1")]
      );
      await escrow.connect(client).fundContract(1, { value: ethers.parseEther("2") });
    });

    it("should submit a milestone", async function () {
      await expect(
        escrow.connect(freelancer).submitMilestone(1, 0, "QmDeliverableCID")
      ).to.emit(escrow, "MilestoneSubmitted");

      const ms = await escrow.getMilestoneDetails(1, 0);
      expect(ms.status).to.equal(2); // Submitted
      expect(ms.deliverableCID).to.equal("QmDeliverableCID");
    });

    it("should reject submit from non-freelancer", async function () {
      await expect(
        escrow.connect(client).submitMilestone(1, 0, "QmCID")
      ).to.be.revertedWith("Only freelancer");
    });

    it("should reject submit with empty CID", async function () {
      await expect(
        escrow.connect(freelancer).submitMilestone(1, 0, "")
      ).to.be.revertedWith("Deliverable CID required");
    });

    it("should approve a milestone and release payment", async function () {
      await escrow.connect(freelancer).submitMilestone(1, 0, "QmDeliverableCID");

      await expect(
        escrow.connect(client).approveMilestone(1, 0)
      ).to.emit(escrow, "MilestoneApproved");

      const ms = await escrow.getMilestoneDetails(1, 0);
      expect(ms.status).to.equal(3); // Approved

      const details = await escrow.getContractDetails(1);
      expect(details.completedMilestones).to.equal(1);
    });

    it("should reject approve from non-client", async function () {
      await escrow.connect(freelancer).submitMilestone(1, 0, "QmCID");
      await expect(
        escrow.connect(freelancer).approveMilestone(1, 0)
      ).to.be.revertedWith("Only client");
    });

    it("should reject approval of non-submitted milestone", async function () {
      await expect(
        escrow.connect(client).approveMilestone(1, 0)
      ).to.be.revertedWith("Milestone not submitted");
    });

    it("should reject a milestone", async function () {
      await escrow.connect(freelancer).submitMilestone(1, 0, "QmCID");
      await expect(
        escrow.connect(client).rejectMilestone(1, 0)
      ).to.emit(escrow, "MilestoneRejected");

      const ms = await escrow.getMilestoneDetails(1, 0);
      expect(ms.status).to.equal(1); // Back to Funded
    });

    it("should complete contract after all milestones approved", async function () {
      await escrow.connect(freelancer).submitMilestone(1, 0, "QmCID");
      await escrow.connect(client).approveMilestone(1, 0);

      await escrow.connect(freelancer).submitMilestone(1, 1, "QmCID2");
      await expect(
        escrow.connect(client).approveMilestone(1, 1)
      ).to.emit(escrow, "ContractCompleted");

      const details = await escrow.getContractDetails(1);
      expect(details.status).to.equal(2); // Completed
    });
  });

  describe("Dispute Resolution", function () {
    beforeEach(async function () {
      await escrow.connect(client).createContract(
        freelancer.address,
        "Test",
        "QmCID",
        ethers.parseEther("2"),
        Math.floor(Date.now() / 1000) + 86400,
        ["M1"],
        [ethers.parseEther("2")]
      );
      await escrow.connect(client).fundContract(1, { value: ethers.parseEther("2") });
    });

    it("should raise a dispute", async function () {
      await expect(
        escrow.connect(freelancer).raiseDispute(1)
      ).to.emit(escrow, "DisputeRaised");

      const c = await escrow.getContractDetails(1);
      expect(c.status).to.equal(4); // Disputed
    });

    it("should resolve dispute in favor of freelancer", async function () {
      await escrow.connect(freelancer).raiseDispute(1);
      await expect(
        escrow.connect(owner).resolveDispute(1, true)
      ).to.emit(escrow, "DisputeResolved");

      const c = await escrow.getContractDetails(1);
      expect(c.status).to.equal(2); // Completed
    });

    it("should resolve dispute in favor of client (refund)", async function () {
      await escrow.connect(freelancer).raiseDispute(1);
      await expect(
        escrow.connect(owner).resolveDispute(1, false)
      ).to.emit(escrow, "DisputeResolved");

      const c = await escrow.getContractDetails(1);
      expect(c.status).to.equal(3); // Cancelled
    });

    it("should only allow owner to resolve disputes", async function () {
      await escrow.connect(freelancer).raiseDispute(1);
      await expect(
        escrow.connect(other).resolveDispute(1, true)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount")
       .withArgs(other.address);
    });
  });

  describe("Contract Cancellation", function () {
    it("should cancel before funding", async function () {
      await escrow.connect(client).createContract(
        freelancer.address,
        "Test",
        "QmCID",
        ethers.parseEther("2"),
        0,
        ["M1"],
        [ethers.parseEther("2")]
      );

      await expect(
        escrow.connect(client).cancelContract(1)
      ).to.emit(escrow, "ContractCancelled");

      const c = await escrow.getContractDetails(1);
      expect(c.status).to.equal(3); // Cancelled
    });
  });

  describe("Contract Queries", function () {
    it("should return client contracts", async function () {
      await escrow.connect(client).createContract(
        freelancer.address, "P1", "QmCID", 0, 0, ["M1"], [0]
      );
      await escrow.connect(client).createContract(
        other.address, "P2", "QmCID", 0, 0, ["M1"], [0]
      );

      const contracts = await escrow.getClientContracts(client.address);
      expect(contracts.length).to.equal(2);
    });

    it("should return freelancer contracts", async function () {
      await escrow.connect(client).createContract(
        freelancer.address, "P1", "QmCID", 0, 0, ["M1"], [0]
      );
      await escrow.connect(other).createContract(
        freelancer.address, "P2", "QmCID", 0, 0, ["M1"], [0]
      );

      const contracts = await escrow.getFreelancerContracts(freelancer.address);
      expect(contracts.length).to.equal(2);
    });
  });
});
