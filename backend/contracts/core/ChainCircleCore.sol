// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

struct UniversalAccountId {
    string chainNamespace;
    string chainId;
    bytes owner;
}

interface IUEAFactory {
    function getOriginForUEA(address addr) external view returns (UniversalAccountId memory account, bool isUEA);
}

interface IReputationManager {
    function onDeposit(uint256 circleId, address user, bool onTime, uint256 amount) external;
    function onCompleted(address user, uint256 circleId) external;
    function onPayoutReceived(address user, uint256 amount) external;
}

interface IYieldModule {
    function calculateYield(uint256 principal, uint256 timeElapsed) external pure returns (uint256);
}

contract ChainCircleCore is Ownable, ReentrancyGuard {

    enum GoalType { HOME, EDUCATION, BUSINESS, EMERGENCY, TRAVEL, OTHER }
    enum Frequency { MONTHLY, WEEKLY }
    enum CircleStatus { Pending, Active, Completed, Paused, Cancelled }

    struct Member {
        address account;
        uint8 paymentsMade;
        bool hasReceivedPayout;
        uint256 contributed;
        bool active;
        uint256 lastPaymentTime;
    }

    struct Circle {
        string name;
        GoalType goalType;
        uint256 amount;
        uint8 duration;
        uint8 currentRound;
        uint8 maxMembers;
        Frequency frequency;
        bool isActive;
        CircleStatus status;
        uint256 createdAt;
        uint256 startAt;
        uint256 vaultBalance;
        address creator;
    }

    struct PaymentRound {
        uint8 roundNumber;
        address[] paidMembers;
        address payoutRecipient;
        uint256 timestamp;
    }

    struct UserStatus {
        bool hasPaid;
        uint256 nextPaymentDue;
        bool isEligibleForPayout;
    }

    struct MemberStatus {
        uint8 paymentsMade;
        uint8 paymentsExpected;
        bool hasReceivedPayout;
        uint8 onTimeRate;
        bool isPaymentDue;
    }

    struct ActivityLog {
        uint256 timestamp;
        address user;
        uint256 circleId;
        string activityType;
        uint256 amount;
    }

    IERC20 public cusd;
    IReputationManager public reputationManager;
    IYieldModule public yieldModule;

    address constant UEA_FACTORY_ADDRESS = 0x00000000000000000000000000000000000000eA;

    uint256 public circleCounter;
    uint256 public totalPooled;
    uint256 public activeCircleCount;

    mapping(uint256 => Circle) public circles;
    mapping(uint256 => address[]) public circleMembers;
    mapping(uint256 => mapping(address => Member)) public members;
    mapping(uint256 => PaymentRound[]) public paymentHistory;
    mapping(uint256 => address[]) public payoutOrder;
    mapping(address => uint256[]) public userCircles;
    mapping(string => uint256) public circleNameToId;
    mapping(uint256 => string) public circleInviteCode;
    mapping(uint256 => string) public circleIcons;
    mapping(address => ActivityLog[]) public userActivityHistory;

    uint256 public constant GRACE_PERIOD = 2 days;
    uint256 public constant MONTHLY_INTERVAL = 30 days;
    uint256 public constant WEEKLY_INTERVAL = 7 days;

    event CircleCreated(uint256 indexed circleId, address indexed creator, uint256 goalAmount);
    event MemberJoined(uint256 indexed circleId, address indexed member);
    event ContributionMade(uint256 indexed circleId, address indexed member, uint256 amount, uint256 timestamp);
    event PayoutProcessed(uint256 indexed circleId, address indexed recipient, uint256 amount, uint256 timestamp);
    event InterestDistributed(uint256 indexed circleId, address indexed recipient, uint256 amount, uint256 timestamp);
    event CircleCompleted(uint256 indexed circleId, uint256 timestamp);
    event EmergencyWithdrawal(uint256 indexed circleId, address indexed member, uint256 amount);
    event ActivityLogged(address indexed user, uint256 circleId, string activityType, uint256 amount);

    constructor(address _cusd) Ownable(msg.sender) {
        cusd = IERC20(_cusd);
    }

    function setReputationManager(address _manager) external onlyOwner {
        reputationManager = IReputationManager(_manager);
    }

    function setYieldModule(address _module) external onlyOwner {
        yieldModule = IYieldModule(_module);
    }

    function createCircle(
        string calldata name,
        uint8 goalType,
        uint256 amount,
        uint8 duration,
        uint8 maxMembers,
        uint8 frequency
    ) external nonReentrant returns (uint256) {
        require(duration >= 3 && duration <= 12, "Invalid duration");
        require(maxMembers >= 3 && maxMembers <= 12, "Invalid max members");
        require(amount >= 100 * 10**6, "Minimum 100 CUSD");

        circleCounter++;
        uint256 circleId = circleCounter;

        Circle storage circle = circles[circleId];
        circle.name = name;
        circle.goalType = GoalType(goalType);
        circle.amount = amount;
        circle.duration = duration;
        circle.maxMembers = maxMembers;
        circle.frequency = Frequency(frequency);
        circle.createdAt = block.timestamp;
        circle.creator = msg.sender;
        circle.status = CircleStatus.Pending;

        circleNameToId[name] = circleId;
        circleInviteCode[circleId] = _generateInviteCode(circleId);
        _setCircleIcon(circleId);

        userCircles[msg.sender].push(circleId);

        emit CircleCreated(circleId, msg.sender, amount * duration);

        _joinCircle(circleId, msg.sender);

        return circleId;
    }

    function _setCircleIcon(uint256 circleId) internal {
        Circle storage circle = circles[circleId];
        
        if (circle.goalType == GoalType.HOME) {
            circleIcons[circleId] = "home";
        } else if (circle.goalType == GoalType.EDUCATION) {
            circleIcons[circleId] = "education";
        } else if (circle.goalType == GoalType.BUSINESS) {
            circleIcons[circleId] = "business";
        } else if (circle.goalType == GoalType.EMERGENCY) {
            circleIcons[circleId] = "emergency";
        } else if (circle.goalType == GoalType.TRAVEL) {
            circleIcons[circleId] = "travel";
        } else {
            circleIcons[circleId] = "other";
        }
    }

    function _logActivity(
        address user,
        uint256 circleId,
        string memory activityType,
        uint256 amount
    ) internal {
        ActivityLog memory log = ActivityLog({
            timestamp: block.timestamp,
            user: user,
            circleId: circleId,
            activityType: activityType,
            amount: amount
        });
        
        userActivityHistory[user].push(log);
        emit ActivityLogged(user, circleId, activityType, amount);
    }

    function joinCircle(uint256 circleId) external nonReentrant {
        _joinCircle(circleId, msg.sender);
    }

    function _joinCircle(uint256 circleId, address user) internal {
        Circle storage circle = circles[circleId];

        require(circle.createdAt > 0, "Circle does not exist");
        require(circle.status == CircleStatus.Pending || circle.status == CircleStatus.Active, "Circle not open");
        require(circleMembers[circleId].length < circle.maxMembers, "Circle full");
        require(!members[circleId][user].active, "Already member");

        circleMembers[circleId].push(user);
        
        Member storage member = members[circleId][user];
        member.account = user;
        member.active = true;

        uint256[] storage userCircleList = userCircles[user];
        if (userCircleList.length == 0 || userCircleList[userCircleList.length - 1] != circleId) {
            userCircles[user].push(circleId);
        }

        emit MemberJoined(circleId, user);

        require(cusd.transferFrom(user, address(this), circle.amount), "Transfer failed");

        member.paymentsMade++;
        member.contributed += circle.amount;
        member.lastPaymentTime = block.timestamp;
        circle.vaultBalance += circle.amount;
        totalPooled += circle.amount;

        emit ContributionMade(circleId, user, circle.amount, block.timestamp);
        _logActivity(user, circleId, "CONTRIBUTE", circle.amount);

        if (circleMembers[circleId].length == circle.maxMembers) {
            circle.status = CircleStatus.Active;
            circle.isActive = true;
            circle.startAt = block.timestamp;
            activeCircleCount++;
            _generatePayoutOrder(circleId);
            
            if (paymentHistory[circleId].length == 0) {
                paymentHistory[circleId].push(PaymentRound({
                    roundNumber: 0,
                    paidMembers: new address[](0),
                    payoutRecipient: payoutOrder[circleId][0],
                    timestamp: block.timestamp
                }));
            }
            
            for (uint256 i = 0; i < circleMembers[circleId].length; i++) {
                paymentHistory[circleId][0].paidMembers.push(circleMembers[circleId][i]);
            }
        }
    }

    function contribute(uint256 circleId) external nonReentrant {
        _contribute(circleId, msg.sender);
    }

    function _contribute(uint256 circleId, address user) internal {
        Circle storage circle = circles[circleId];
        Member storage member = members[circleId][user];

        require(circle.isActive, "Circle not active");
        require(member.active, "Not a member");
        require(member.paymentsMade < circle.duration, "All payments made");

        uint256 dueTime = _calculateDueTime(circleId, circle.currentRound);
        bool onTime = block.timestamp <= dueTime + GRACE_PERIOD;

        require(cusd.transferFrom(user, address(this), circle.amount), "Transfer failed");

        member.paymentsMade++;
        member.contributed += circle.amount;
        member.lastPaymentTime = block.timestamp;
        circle.vaultBalance += circle.amount;
        totalPooled += circle.amount;

        if (address(reputationManager) != address(0)) {
            reputationManager.onDeposit(circleId, user, onTime, circle.amount);
        }

        emit ContributionMade(circleId, user, circle.amount, block.timestamp);
        _logActivity(user, circleId, "CONTRIBUTE", circle.amount);

        if (paymentHistory[circleId].length <= circle.currentRound) {
            paymentHistory[circleId].push(PaymentRound({
                roundNumber: circle.currentRound,
                paidMembers: new address[](0),
                payoutRecipient: payoutOrder[circleId][circle.currentRound],
                timestamp: block.timestamp
            }));
        }
        
        paymentHistory[circleId][circle.currentRound].paidMembers.push(user);

        _checkRoundCompletion(circleId);
    }

    function _checkRoundCompletion(uint256 circleId) internal {
        Circle storage circle = circles[circleId];
        uint256 memberCount = circleMembers[circleId].length;
        uint256 paidCount = 0;

        for (uint256 i = 0; i < memberCount; i++) {
            address memberAddr = circleMembers[circleId][i];
            if (members[circleId][memberAddr].paymentsMade > circle.currentRound) {
                paidCount++;
            }
        }

        if (paidCount == memberCount) {
            _processPayout(circleId);
            
            circle.currentRound++;
            
            if (circle.currentRound >= circle.duration) {
                _completeCircle(circleId);
            }
        }
    }

    function _processPayout(uint256 circleId) internal {
        Circle storage circle = circles[circleId];
        address recipient = payoutOrder[circleId][circle.currentRound];
        
        uint256 poolAmount = circle.amount * circleMembers[circleId].length;
        uint256 interest = 0;
        
        if (address(yieldModule) != address(0)) {
            uint256 timeElapsed = block.timestamp - circle.startAt;
            interest = yieldModule.calculateYield(poolAmount, timeElapsed);
        }

        uint256 totalPayout = poolAmount + interest;
        
        circle.vaultBalance -= poolAmount;
        
        if (interest > 0) {
            require(cusd.transfer(recipient, totalPayout), "Payout failed");
        } else {
            require(cusd.transfer(recipient, poolAmount), "Payout failed");
        }
        
        members[circleId][recipient].hasReceivedPayout = true;

        if (address(reputationManager) != address(0)) {
            reputationManager.onPayoutReceived(recipient, interest);
        }

        emit PayoutProcessed(circleId, recipient, poolAmount, block.timestamp);
        _logActivity(recipient, circleId, "WITHDRAW", poolAmount);
        
        if (interest > 0) {
            emit InterestDistributed(circleId, recipient, interest, block.timestamp);
            _logActivity(recipient, circleId, "INTEREST", interest);
        }
    }

    function _completeCircle(uint256 circleId) internal {
        Circle storage circle = circles[circleId];
        
        circle.status = CircleStatus.Completed;
        circle.isActive = false;
        activeCircleCount--;

        uint256 memberCount = circleMembers[circleId].length;
        for (uint256 i = 0; i < memberCount; i++) {
            address memberAddr = circleMembers[circleId][i];
            if (address(reputationManager) != address(0)) {
                reputationManager.onCompleted(memberAddr, circleId);
            }
        }

        emit CircleCompleted(circleId, block.timestamp);
    }

    function _generatePayoutOrder(uint256 circleId) internal {
        address[] memory membersList = circleMembers[circleId];
        uint256 memberCount = membersList.length;
        
        for (uint256 i = 0; i < memberCount; i++) {
            uint256 randomIndex = uint256(keccak256(abi.encodePacked(block.timestamp, i, circleId))) % memberCount;
            
            address temp = membersList[i];
            membersList[i] = membersList[randomIndex];
            membersList[randomIndex] = temp;
        }
        
        payoutOrder[circleId] = membersList;
    }

    function _calculateDueTime(uint256 circleId, uint8 round) internal view returns (uint256) {
        Circle memory circle = circles[circleId];
        uint256 interval = circle.frequency == Frequency.MONTHLY ? MONTHLY_INTERVAL : WEEKLY_INTERVAL;
        return circle.startAt + (interval * round);
    }

    function withdrawPayout(uint256 circleId) external nonReentrant {
        Member storage member = members[circleId][msg.sender];
        require(member.hasReceivedPayout, "No payout available");
    }

    function emergencyWithdraw(uint256 circleId) external nonReentrant {
        Circle storage circle = circles[circleId];
        Member storage member = members[circleId][msg.sender];

        require(member.active, "Not a member");
        require(member.contributed > 0, "No contributions");

        uint256 penalty = (member.contributed * 10) / 100;
        uint256 withdrawAmount = member.contributed - penalty;

        member.active = false;
        circle.vaultBalance -= member.contributed;

        require(cusd.transfer(msg.sender, withdrawAmount), "Withdrawal failed");

        emit EmergencyWithdrawal(circleId, msg.sender, withdrawAmount);
    }

    function getCircleDetails(uint256 circleId) external view returns (Circle memory) {
        return circles[circleId];
    }

    function getCircleWithUserStatus(uint256 circleId, address user) 
        external 
        view 
        returns (Circle memory circle, UserStatus memory status) 
    {
        circle = circles[circleId];
        Member memory member = members[circleId][user];
        
        status.hasPaid = member.paymentsMade > circle.currentRound;
        status.nextPaymentDue = _calculateDueTime(circleId, circle.currentRound);
        status.isEligibleForPayout = member.hasReceivedPayout;
    }

    function getMemberStatus(uint256 circleId, address memberAddr) 
        external 
        view 
        returns (MemberStatus memory status) 
    {
        Circle memory circle = circles[circleId];
        Member memory member = members[circleId][memberAddr];
        
        status.paymentsMade = member.paymentsMade;
        status.paymentsExpected = circle.currentRound + 1;
        status.hasReceivedPayout = member.hasReceivedPayout;
        status.isPaymentDue = member.paymentsMade <= circle.currentRound;
        
        if (member.paymentsMade > 0) {
            uint256 onTimeCount = 0;
            for (uint256 i = 0; i < member.paymentsMade; i++) {
                uint256 dueTime = _calculateDueTime(circleId, uint8(i));
                if (member.lastPaymentTime <= dueTime + GRACE_PERIOD) {
                    onTimeCount++;
                }
            }
            status.onTimeRate = uint8((onTimeCount * 100) / member.paymentsMade);
        }
    }

    function getNextPayoutRecipient(uint256 circleId) 
        external 
        view 
        returns (address recipient, uint256 dueDate) 
    {
        Circle memory circle = circles[circleId];
        if (circle.currentRound < payoutOrder[circleId].length) {
            recipient = payoutOrder[circleId][circle.currentRound];
            dueDate = _calculateDueTime(circleId, circle.currentRound);
        }
    }

    function getCircleInterestEarned(uint256 circleId) external view returns (uint256) {
        Circle memory circle = circles[circleId];
        if (address(yieldModule) == address(0)) return 0;
        
        uint256 poolAmount = circle.amount * circleMembers[circleId].length;
        uint256 timeElapsed = block.timestamp - circle.startAt;
        return yieldModule.calculateYield(poolAmount, timeElapsed);
    }

    function getCirclePaymentHistory(uint256 circleId) 
        external 
        view 
        returns (PaymentRound[] memory) 
    {
        return paymentHistory[circleId];
    }

    function getPendingWithdrawal(uint256 circleId, address user) 
        external 
        view 
        returns (uint256 amount, bool isAvailable) 
    {
        Member memory member = members[circleId][user];
        isAvailable = member.hasReceivedPayout;
        
        if (isAvailable) {
            Circle memory circle = circles[circleId];
            amount = circle.amount * circleMembers[circleId].length;
        }
    }

    function getTotalPooled() external view returns (uint256) {
        return totalPooled;
    }
    function getActiveCircleCount() external view returns (uint256) {
        return activeCircleCount;
    }

    function getUserCircles(address user) external view returns (uint256[] memory) {
        return userCircles[user];
    }

    function getUserTotalContributions(address user) external view returns (uint256) {
        uint256 total = 0;
        uint256[] memory userCircleIds = userCircles[user];
        
        for (uint256 i = 0; i < userCircleIds.length; i++) {
            total += members[userCircleIds[i]][user].contributed;
        }
        
        return total;
    }

    function getUserActiveCircleCount(address user) external view returns (uint256) {
        uint256 count = 0;
        uint256[] memory userCircleIds = userCircles[user];
        
        for (uint256 i = 0; i < userCircleIds.length; i++) {
            if (circles[userCircleIds[i]].isActive) {
                count++;
            }
        }
        
        return count;
    }

    function getUserTotalInterest(address user) external view returns (uint256) {
        uint256 totalInterest = 0;
        uint256[] memory userCircleIds = userCircles[user];
        
        for (uint256 i = 0; i < userCircleIds.length; i++) {
            uint256 circleId = userCircleIds[i];
            if (members[circleId][user].hasReceivedPayout && address(yieldModule) != address(0)) {
                Circle memory circle = circles[circleId];
                uint256 poolAmount = circle.amount * circleMembers[circleId].length;
                uint256 timeElapsed = block.timestamp - circle.startAt;
                totalInterest += yieldModule.calculateYield(poolAmount, timeElapsed);
            }
        }
        
        return totalInterest;
    }

    function getRecentActivity(address user, uint256 limit) 
        external 
        view 
        returns (ActivityLog[] memory) 
    {
        ActivityLog[] memory history = userActivityHistory[user];
        uint256 length = history.length;
        
        if (length == 0) {
            return new ActivityLog[](0);
        }
        
        uint256 count = length < limit ? length : limit;
        ActivityLog[] memory recent = new ActivityLog[](count);
        
        for (uint256 i = 0; i < count; i++) {
            recent[i] = history[length - 1 - i];
        }
        
        return recent;
    }

    function getCircleProgress(uint256 circleId) 
        external 
        view 
        returns (uint256 percentage, string memory circleName, string memory icon) 
    {
        Circle memory circle = circles[circleId];
        
        if (circle.duration == 0) {
            return (0, "", "");
        }
        
        percentage = (circle.currentRound * 100) / circle.duration;
        circleName = circle.name;
        icon = circleIcons[circleId];
    }

    function getUserPayoutHistory(address user) 
        external 
        view 
        returns (
            uint256[] memory circleIds,
            uint256[] memory amounts,
            uint256[] memory dates,
            string[] memory circleNames,
            bool[] memory claimed
        ) 
    {
        uint256[] memory userCircleIds = userCircles[user];
        uint256 count = 0;
        
        for (uint256 i = 0; i < userCircleIds.length; i++) {
            if (members[userCircleIds[i]][user].hasReceivedPayout) {
                count++;
            }
        }
        
        circleIds = new uint256[](count);
        amounts = new uint256[](count);
        dates = new uint256[](count);
        circleNames = new string[](count);
        claimed = new bool[](count);
        
        uint256 index = 0;
        for (uint256 i = 0; i < userCircleIds.length; i++) {
            uint256 circleId = userCircleIds[i];
            Member memory member = members[circleId][user];
            
            if (member.hasReceivedPayout) {
                circleIds[index] = circleId;
                amounts[index] = circles[circleId].amount * circleMembers[circleId].length;
                dates[index] = member.lastPaymentTime;
                circleNames[index] = circles[circleId].name;
                claimed[index] = true;
                index++;
            }
        }
    }

    function getUserUpcomingPayouts(address user) 
        external 
        view 
        returns (
            uint256[] memory circleIds,
            string[] memory circleNames,
            uint256[] memory estimatedDates
        ) 
    {
        uint256[] memory userCircleIds = userCircles[user];
        uint256 count = 0;
        
        for (uint256 i = 0; i < userCircleIds.length; i++) {
            uint256 circleId = userCircleIds[i];
            if (circles[circleId].isActive && !members[circleId][user].hasReceivedPayout) {
                address[] memory order = payoutOrder[circleId];
                for (uint256 j = 0; j < order.length; j++) {
                    if (order[j] == user && j >= circles[circleId].currentRound) {
                        count++;
                        break;
                    }
                }
            }
        }
        
        circleIds = new uint256[](count);
        circleNames = new string[](count);
        estimatedDates = new uint256[](count);
        
        uint256 index = 0;
        for (uint256 i = 0; i < userCircleIds.length; i++) {
            uint256 circleId = userCircleIds[i];
            Circle memory circle = circles[circleId];
            
            if (circle.isActive && !members[circleId][user].hasReceivedPayout) {
                address[] memory order = payoutOrder[circleId];
                for (uint256 j = 0; j < order.length; j++) {
                    if (order[j] == user && j >= circle.currentRound) {
                        circleIds[index] = circleId;
                        circleNames[index] = circle.name;
                        estimatedDates[index] = _calculateDueTime(circleId, uint8(j));
                        index++;
                        break;
                    }
                }
            }
        }
    }

    function getUserChainOrigin(address user) external view returns (string memory chainType, bool isExternal) {
        (UniversalAccountId memory account, bool isUEA) = 
            IUEAFactory(UEA_FACTORY_ADDRESS).getOriginForUEA(user);
        
        isExternal = isUEA;
        
        if (!isUEA) {
            chainType = "Push Chain";
            return (chainType, isExternal);
        }

        bytes32 chainHash = keccak256(abi.encodePacked(account.chainNamespace, account.chainId));
        
        if (chainHash == keccak256(abi.encodePacked("eip155", "11155111"))) {
            chainType = "Ethereum Sepolia";
        } else if (chainHash == keccak256(abi.encodePacked("solana", "EtWTRABZaYq6iMfeYKouRu166VU2xqa1"))) {
            chainType = "Solana Devnet";
        } else if (chainHash == keccak256(abi.encodePacked("eip155", "42101"))) {
            chainType = "Push Chain";
        } else {
            chainType = "Unknown Chain";
        }
    }

    function getCircleByName(string calldata name) external view returns (uint256) {
        return circleNameToId[name];
    }

    function getCircleInviteCode(uint256 circleId) external view returns (string memory) {
        require(circles[circleId].createdAt > 0, "Circle does not exist");
        return circleInviteCode[circleId];
    }

    function searchCircles(string calldata searchTerm) external view returns (uint256[] memory) {
        uint256[] memory results = new uint256[](circleCounter);
        uint256 resultCount = 0;

        for (uint256 i = 1; i <= circleCounter; i++) {
            if (_contains(circles[i].name, searchTerm)) {
                results[resultCount] = i;
                resultCount++;
            }
        }

        uint256[] memory trimmedResults = new uint256[](resultCount);
        for (uint256 i = 0; i < resultCount; i++) {
            trimmedResults[i] = results[i];
        }

        return trimmedResults;
    }

    function _generateInviteCode(uint256 circleId) internal view returns (string memory) {
        bytes32 hash = keccak256(abi.encodePacked(circleId, block.timestamp, msg.sender));
        return _toHexString(hash);
    }

    function _toHexString(bytes32 data) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(64);
        for (uint256 i = 0; i < 32; i++) {
            str[i * 2] = alphabet[uint8(data[i] >> 4)];
            str[1 + i * 2] = alphabet[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }

    function _contains(string memory source, string memory searchTerm) internal pure returns (bool) {
        bytes memory sourceBytes = bytes(source);
        bytes memory searchBytes = bytes(searchTerm);

        if (searchBytes.length == 0) return true;
        if (searchBytes.length > sourceBytes.length) return false;

        for (uint256 i = 0; i <= sourceBytes.length - searchBytes.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < searchBytes.length; j++) {
                if (_toLower(sourceBytes[i + j]) != _toLower(searchBytes[j])) {
                    found = false;
                    break;
                }
            }
            if (found) return true;
        }
        return false;
    }

    function _toLower(bytes1 char) internal pure returns (bytes1) {
        if (char >= 0x41 && char <= 0x5A) {
            return bytes1(uint8(char) + 32);
        }
        return char;
    }
}