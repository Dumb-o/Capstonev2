// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../GigEscrow.sol";

contract MaliciousReceiver {
    GigEscrow public escrow;
    uint256 public targetContractId;
    uint256 public targetMilestoneIndex;
    bool public attackEnabled;
    uint256 public reentrancyAttempts;

    constructor(address _escrow) {
        escrow = GigEscrow(_escrow);
    }

    function setAttack(uint256 _contractId, uint256 _milestoneIndex, bool _attack) external {
        targetContractId = _contractId;
        targetMilestoneIndex = _milestoneIndex;
        attackEnabled = _attack;
    }

    function submitMilestone(uint256 _contractId, uint256 _milestoneIndex, string memory _deliverableCID) external {
        escrow.submitMilestone(_contractId, _milestoneIndex, _deliverableCID);
    }

    function tryReenterApprove() external {
        require(attackEnabled, "Attack not enabled");
        escrow.approveMilestone(targetContractId, targetMilestoneIndex);
    }

    function tryReenterResolve(bool _releaseToFreelancer) external {
        require(attackEnabled, "Attack not enabled");
        escrow.resolveDispute(targetContractId, _releaseToFreelancer);
    }

    function tryReenterCancel() external {
        require(attackEnabled, "Attack not enabled");
        escrow.cancelContract(targetContractId);
    }

    receive() external payable {
        if (attackEnabled) {
            reentrancyAttempts++;
            try escrow.approveMilestone(targetContractId, targetMilestoneIndex) {
            } catch { }
        }
    }
}
