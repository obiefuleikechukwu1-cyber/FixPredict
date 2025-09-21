;; title: FixPredict - Predictive Maintenance Marketplace
;; version: 1.0.0
;; summary: IoT-powered predictive maintenance with outcome-based payment contracts
;; description: A marketplace where equipment owners can register IoT-monitored assets,
;;              service providers can stake on maintenance predictions, and insurance
;;              coverage protects against prediction failures.

;; traits
(define-trait maintenance-provider-trait
  (
    ;; Get provider reputation score
    (get-reputation (principal) (response uint uint))
    ;; Submit maintenance prediction
    (submit-prediction (uint uint uint uint) (response bool uint))
  )
)

;; token definitions
(define-fungible-token fix-token)
(define-non-fungible-token equipment-nft uint)
(define-non-fungible-token maintenance-contract-nft uint)

;; constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-unauthorized (err u102))
(define-constant err-invalid-input (err u103))
(define-constant err-insufficient-funds (err u104))
(define-constant err-already-exists (err u105))
(define-constant err-contract-expired (err u106))
(define-constant err-prediction-window-closed (err u107))
(define-constant err-maintenance-not-due (err u108))
(define-constant err-invalid-stake (err u109))

(define-constant min-stake-amount u1000)
(define-constant max-prediction-window u48) ;; 48 hours
(define-constant insurance-fee-rate u5) ;; 5% of contract value
(define-constant platform-fee-rate u2) ;; 2% of contract value

;; data vars
(define-data-var next-equipment-id uint u1)
(define-data-var next-contract-id uint u1)
(define-data-var total-equipment-registered uint u0)
(define-data-var total-predictions-made uint u0)
(define-data-var platform-treasury uint u0)
(define-data-var insurance-pool uint u0)

;; data maps
(define-map equipment-registry
  { equipment-id: uint }
  {
    owner: principal,
    equipment-type: (string-ascii 50),
    location: (string-ascii 100),
    iot-sensor-id: (string-ascii 64),
    registration-block: uint,
    last-maintenance: uint,
    is-active: bool,
    total-downtime: uint
  }
)

(define-map maintenance-contracts
  { contract-id: uint }
  {
    equipment-id: uint,
    service-provider: principal,
    predicted-failure-block: uint,
    prediction-window-start: uint,
    prediction-window-end: uint,
    stake-amount: uint,
    contract-value: uint,
    status: (string-ascii 20), ;; "active", "completed", "failed", "disputed"
    created-block: uint,
    insurance-coverage: bool,
    accuracy-score: uint
  }
)

(define-map provider-profiles
  { provider: principal }
  {
    company-name: (string-ascii 100),
    registration-block: uint,
    total-contracts: uint,
    successful-predictions: uint,
    failed-predictions: uint,
    total-staked: uint,
    reputation-score: uint,
    is-verified: bool
  }
)

(define-map equipment-predictions
  { equipment-id: uint, block-height: uint }
  {
    predicted-failure-type: (string-ascii 50),
    confidence-level: uint, ;; 0-100
    recommended-action: (string-ascii 200),
    prediction-timestamp: uint,
    sensor-data-hash: (buff 32),
    ai-model-version: (string-ascii 20)
  }
)

(define-map staking-positions
  { contract-id: uint, provider: principal }
  {
    stake-amount: uint,
    locked-until-block: uint,
    expected-return: uint,
    risk-level: uint
  }
)

(define-map insurance-claims
  { contract-id: uint }
  {
    claim-amount: uint,
    claimant: principal,
    claim-reason: (string-ascii 200),
    claim-status: (string-ascii 20), ;; "pending", "approved", "denied"
    claim-block: uint,
    resolution-block: (optional uint)
  }
)
