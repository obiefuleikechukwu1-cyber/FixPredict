# FixPredict - IoT-Powered Predictive Maintenance Marketplace

## Overview

FixPredict is a decentralized marketplace that revolutionizes industrial maintenance through IoT-powered predictive analytics. Equipment owners can register IoT-monitored assets, while service providers stake on maintenance predictions with outcome-based payments. An insurance system protects against prediction failures, creating a comprehensive ecosystem for preventive maintenance.

## 🚀 Recent Enhancements

### 1. Enhanced Security Features

- **Emergency Mode**: Contract owner can activate emergency pause with automatic 10-day timeout
- **Reentrancy Protection**: Non-reentrant guards prevent attack vectors
- **Rate Limiting**: Operations capped at 5 per 10 blocks to prevent spam/DoS
- **Timelock Security**: Critical treasury changes require 10-day delay
- **Safe Math Operations**: Overflow/underflow protection for all arithmetic
- **Comprehensive Input Validation**: Multi-layer validation for all user inputs

### 2. Performance Optimizations

- **Batch Operations**: `batch-register-equipment`, `batch-submit-predictions`, and `batch-validate-predictions` for gas efficiency
- **Optimized Processing**: Streamlined prediction validation and insurance claims
- **Efficient Data Structures**: Optimized map operations and data retrieval

### 3. Comprehensive Test Suite

- **25+ Test Cases**: Covering all contract functions and security features
- **Security Testing**: Access controls, rate limiting, emergency mode validation
- **Edge Cases**: Invalid inputs, overflow conditions, error handling
- **Integration Tests**: End-to-end prediction and validation workflows

### 4. Professional Web Dashboard

- **IoT Equipment Management**: Register and monitor industrial equipment
- **Prediction Marketplace**: Submit and track maintenance predictions
- **Real-time Analytics**: Platform statistics and user metrics
- **Insurance Management**: Claim processing and payout tracking
- **Responsive Design**: Modern UI optimized for industrial users

## 🏗️ Architecture

### Smart Contract Features

- **NFT Standards**: Equipment and maintenance contract NFTs
- **Fungible Tokens**: FIX tokens for staking and payments
- **Multi-stakeholder System**: Equipment owners, service providers, insurers
- **Outcome-based Payments**: Rewards based on prediction accuracy
- **Insurance Coverage**: Protection against prediction failures

### Security Features

- **Access Control**: Owner-only administrative functions
- **Emergency Controls**: Circuit breaker pattern for incident response
- **Input Sanitization**: Comprehensive validation and bounds checking
- **Audit Trail**: Complete transaction history and state tracking

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- Clarinet
- Stacks Wallet (for testing)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd FixPredict

# Install dependencies
npm install

# Run tests
npm test

# Check contract
clarinet check

# Start development console
clarinet console
```

### Web Dashboard

Open `fixpredict-dashboard.html` in a modern web browser to interact with the contract through a user-friendly interface.

## 📋 Contract Functions

### Public Functions

- `register-equipment`: Register IoT-monitored equipment
- `register-service-provider`: Register maintenance service provider
- `submit-maintenance-prediction`: Submit predictive maintenance prediction
- `validate-prediction`: Validate prediction outcome and distribute rewards
- `claim-insurance`: Submit insurance claim for failed predictions
- `process-insurance-claim`: Process insurance claims (owner only)
- `pause-contract`/`unpause-contract`: Emergency pause controls
- `enable-emergency-mode`/`disable-emergency-mode`: Emergency mode controls
- `set-platform-treasury`/`execute-treasury-change`: Treasury management with timelock
- `batch-register-equipment`: Register multiple equipment efficiently
- `batch-submit-predictions`: Submit multiple predictions in batch
- `batch-validate-predictions`: Validate multiple predictions at once

### Read-Only Functions

- `get-equipment-info`: Retrieve equipment details
- `get-contract-info`: Get maintenance contract information
- `get-provider-profile`: Service provider profile and reputation
- `get-platform-stats`: Comprehensive platform statistics
- `get-staking-position`: Staking information for contracts
- `get-insurance-claim`: Insurance claim status and details
- Security status functions: emergency mode, contract pause status

## 🔧 Configuration

### Constants

- `min-stake-amount`: 1000 FIX minimum stake
- `max-prediction-window`: 48 hours prediction window
- `insurance-fee-rate`: 5% insurance fee
- `platform-fee-rate`: 2% platform fee
- `RATE-LIMIT-BLOCKS`: 10 blocks for rate limiting
- `MAX-OPERATIONS-PER-BLOCK`: 5 operations per block

### Emergency Mode
- `EMERGENCY_MODE_DURATION`: 1440 blocks (10 days)
- Automatic timeout prevents permanent lockout

## 🧪 Testing

Run the comprehensive test suite:

```bash
npm test
```

Tests cover:
- Token management and balances
- Equipment registration and management
- Service provider registration and reputation
- Prediction submission and validation
- Insurance claims and processing
- Security features and access controls
- Emergency mode and treasury management
- Batch operations performance
- Edge cases and error handling

## 📊 Performance Metrics

- **Batch Efficiency**: Up to 10x gas savings for bulk operations
- **Prediction Processing**: Optimized validation workflows
- **Insurance Claims**: Streamlined payout processes
- **Security Overhead**: Minimal performance impact

## 🔒 Security Considerations

- Emergency pause functionality for incident response
- Timelock mechanisms prevent unauthorized critical changes
- Rate limiting prevents spam and DoS attacks
- Safe math operations prevent numerical exploits
- Access controls for administrative functions
- Comprehensive input validation prevents malformed data attacks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive tests
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built on the Stacks blockchain
- Uses Clarinet for development and testing
- Inspired by IoT predictive maintenance and decentralized marketplaces

## 🎯 Use Cases

### For Equipment Owners
- Register IoT-monitored industrial equipment
- Receive predictive maintenance alerts
- Access insurance coverage for equipment failures
- Transparent pricing and service quality metrics

### For Service Providers
- Stake on maintenance predictions with outcome-based rewards
- Build reputation through successful predictions
- Access comprehensive equipment data
- Participate in decentralized maintenance marketplace

### For Insurers
- Provide coverage for prediction failures
- Access historical performance data
- Automated claim processing
- Risk assessment through prediction analytics

The FixPredict platform creates a comprehensive ecosystem that leverages blockchain transparency with IoT sensor data to revolutionize industrial maintenance practices.
