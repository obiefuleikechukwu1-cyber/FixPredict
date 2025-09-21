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


;; public functions

(define-public (register-equipment (equipment-type (string-ascii 50)) 
                                 (location (string-ascii 100))
                                 (iot-sensor-id (string-ascii 64)))
  (let (
    (equipment-id (var-get next-equipment-id))
  )
    (asserts! (> (len equipment-type) u0) err-invalid-input)
    (asserts! (> (len iot-sensor-id) u0) err-invalid-input)
    
    (try! (nft-mint? equipment-nft equipment-id tx-sender))
    
    (map-set equipment-registry
      { equipment-id: equipment-id }
      {
        owner: tx-sender,
        equipment-type: equipment-type,
        location: location,
        iot-sensor-id: iot-sensor-id,
        registration-block: block-height,
        last-maintenance: block-height,
        is-active: true,
        total-downtime: u0
      }
    )
    
    (var-set next-equipment-id (+ equipment-id u1))
    (var-set total-equipment-registered (+ (var-get total-equipment-registered) u1))
    
    (ok equipment-id)
  )
)

(define-public (register-service-provider (company-name (string-ascii 100)))
  (let (
    (existing-profile (map-get? provider-profiles { provider: tx-sender }))
  )
    (asserts! (is-none existing-profile) err-already-exists)
    (asserts! (> (len company-name) u0) err-invalid-input)
    
    (map-set provider-profiles
      { provider: tx-sender }
      {
        company-name: company-name,
        registration-block: block-height,
        total-contracts: u0,
        successful-predictions: u0,
        failed-predictions: u0,
        total-staked: u0,
        reputation-score: u50, ;; Start with neutral reputation
        is-verified: false
      }
    )
    
    (ok true)
  )
)

(define-public (submit-maintenance-prediction (equipment-id uint)
                                            (predicted-failure-block uint)
                                            (stake-amount uint)
                                            (contract-value uint))
  (let (
    (contract-id (var-get next-contract-id))
    (equipment-info (unwrap! (map-get? equipment-registry { equipment-id: equipment-id }) err-not-found))
    (provider-profile (unwrap! (map-get? provider-profiles { provider: tx-sender }) err-unauthorized))
    (prediction-window-end (+ block-height max-prediction-window))
    (insurance-fee (/ (* contract-value insurance-fee-rate) u100))
    (platform-fee (/ (* contract-value platform-fee-rate) u100))
    (total-required (+ stake-amount insurance-fee platform-fee))
  )
    (asserts! (get is-active equipment-info) err-invalid-input)
    (asserts! (>= stake-amount min-stake-amount) err-invalid-stake)
    (asserts! (> predicted-failure-block block-height) err-invalid-input)
    (asserts! (<= predicted-failure-block (+ block-height u10080)) err-invalid-input) ;; Max 1 week ahead
    (asserts! (>= (ft-get-balance fix-token tx-sender) total-required) err-insufficient-funds)
    
    ;; Transfer tokens for stake, insurance, and platform fee
    (try! (ft-transfer? fix-token total-required tx-sender (as-contract tx-sender)))
    
    ;; Update insurance pool and platform treasury
    (var-set insurance-pool (+ (var-get insurance-pool) insurance-fee))
    (var-set platform-treasury (+ (var-get platform-treasury) platform-fee))
    
    ;; Mint maintenance contract NFT
    (try! (nft-mint? maintenance-contract-nft contract-id tx-sender))
    
    ;; Create maintenance contract
    (map-set maintenance-contracts
      { contract-id: contract-id }
      {
        equipment-id: equipment-id,
        service-provider: tx-sender,
        predicted-failure-block: predicted-failure-block,
        prediction-window-start: block-height,
        prediction-window-end: prediction-window-end,
        stake-amount: stake-amount,
        contract-value: contract-value,
        status: "active",
        created-block: block-height,
        insurance-coverage: true,
        accuracy-score: u0
      }
    )
    
    ;; Record staking position
    (map-set staking-positions
      { contract-id: contract-id, provider: tx-sender }
      {
        stake-amount: stake-amount,
        locked-until-block: (+ predicted-failure-block u144), ;; Lock for 24 hours after prediction
        expected-return: (/ (* stake-amount u110) u100), ;; 10% expected return
        risk-level: u50
      }
    )
    
    ;; Update provider stats
    (map-set provider-profiles
      { provider: tx-sender }
      (merge provider-profile {
        total-contracts: (+ (get total-contracts provider-profile) u1),
        total-staked: (+ (get total-staked provider-profile) stake-amount)
      })
    )
    
    (var-set next-contract-id (+ contract-id u1))
    (var-set total-predictions-made (+ (var-get total-predictions-made) u1))
    
    (ok contract-id)
  )
)

(define-public (validate-prediction (contract-id uint) (maintenance-occurred bool))
  (let (
    (contract-info (unwrap! (map-get? maintenance-contracts { contract-id: contract-id }) err-not-found))
    (equipment-info (unwrap! (map-get? equipment-registry { equipment-id: (get equipment-id contract-info) }) err-not-found))
    (provider (get service-provider contract-info))
    (stake-position (unwrap! (map-get? staking-positions { contract-id: contract-id, provider: provider }) err-not-found))
    (provider-profile (unwrap! (map-get? provider-profiles { provider: provider }) err-not-found))
  )
    ;; Only equipment owner can validate
    (asserts! (is-eq tx-sender (get owner equipment-info)) err-unauthorized)
    
    ;; Check if we're within validation window
    (asserts! (>= block-height (get prediction-window-start contract-info)) err-prediction-window-closed)
    (asserts! (<= block-height (get prediction-window-end contract-info)) err-prediction-window-closed)
    
    ;; Check if contract is still active
    (asserts! (is-eq (get status contract-info) "active") err-contract-expired)
    
    (if maintenance-occurred
      ;; Prediction was correct - reward the provider
      (begin
        (try! (as-contract (ft-transfer? fix-token 
                           (get expected-return stake-position)
                           tx-sender
                           provider)))
        
        ;; Update contract status
        (map-set maintenance-contracts
          { contract-id: contract-id }
          (merge contract-info {
            status: "completed",
            accuracy-score: u100
          })
        )
        
        ;; Update equipment last maintenance
        (map-set equipment-registry
          { equipment-id: (get equipment-id contract-info) }
          (merge equipment-info {
            last-maintenance: block-height
          })
        )
        
        ;; Update provider success stats
        (map-set provider-profiles
          { provider: provider }
          (merge provider-profile {
            successful-predictions: (+ (get successful-predictions provider-profile) u1),
            reputation-score: (min u100 (+ (get reputation-score provider-profile) u5))
          })
        )
        
        (ok "prediction-correct")
      )
      ;; Prediction was wrong - provider loses stake
      (begin
        ;; Update contract status
        (map-set maintenance-contracts
          { contract-id: contract-id }
          (merge contract-info {
            status: "failed",
            accuracy-score: u0
          })
        )
        
        ;; Update provider failure stats
        (map-set provider-profiles
          { provider: provider }
          (merge provider-profile {
            failed-predictions: (+ (get failed-predictions provider-profile) u1),
            reputation-score: (max u0 (- (get reputation-score provider-profile) u10))
          })
        )
        
        ;; Stake goes to insurance pool
        (var-set insurance-pool (+ (var-get insurance-pool) (get stake-amount stake-position)))
        
        (ok "prediction-failed")
      )
    )
  )
)

(define-public (claim-insurance (contract-id uint) (claim-amount uint) (claim-reason (string-ascii 200)))
  (let (
    (contract-info (unwrap! (map-get? maintenance-contracts { contract-id: contract-id }) err-not-found))
    (equipment-info (unwrap! (map-get? equipment-registry { equipment-id: (get equipment-id contract-info) }) err-not-found))
    (existing-claim (map-get? insurance-claims { contract-id: contract-id }))
  )
    ;; Only equipment owner can claim insurance
    (asserts! (is-eq tx-sender (get owner equipment-info)) err-unauthorized)
    
    ;; Check if insurance coverage exists
    (asserts! (get insurance-coverage contract-info) err-unauthorized)
    
    ;; Check if no existing claim
    (asserts! (is-none existing-claim) err-already-exists)
    
    ;; Check if prediction failed
    (asserts! (is-eq (get status contract-info) "failed") err-unauthorized)
    
    ;; Check if claim amount is reasonable (max contract value)
    (asserts! (<= claim-amount (get contract-value contract-info)) err-invalid-input)
    
    ;; Create insurance claim
    (map-set insurance-claims
      { contract-id: contract-id }
      {
        claim-amount: claim-amount,
        claimant: tx-sender,
        claim-reason: claim-reason,
        claim-status: "pending",
        claim-block: block-height,
        resolution-block: none
      }
    )
    
    (ok contract-id)
  )
)

(define-public (process-insurance-claim (contract-id uint) (approve bool))
  (let (
    (claim-info (unwrap! (map-get? insurance-claims { contract-id: contract-id }) err-not-found))
  )
    ;; Only contract owner can process claims
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    
    ;; Check if claim is pending
    (asserts! (is-eq (get claim-status claim-info) "pending") err-invalid-input)
    
    (if approve
      (begin
        ;; Check if insurance pool has sufficient funds
        (asserts! (>= (var-get insurance-pool) (get claim-amount claim-info)) err-insufficient-funds)
        
        ;; Transfer insurance payout
        (try! (as-contract (ft-transfer? fix-token 
                           (get claim-amount claim-info)
                           tx-sender
                           (get claimant claim-info))))
        
        ;; Update insurance pool
        (var-set insurance-pool (- (var-get insurance-pool) (get claim-amount claim-info)))
        
        ;; Update claim status
        (map-set insurance-claims
          { contract-id: contract-id }
          (merge claim-info {
            claim-status: "approved",
            resolution-block: (some block-height)
          })
        )
        
        (ok "claim-approved")
      )
      ;; Deny claim
      (begin
        (map-set insurance-claims
          { contract-id: contract-id }
          (merge claim-info {
            claim-status: "denied",
            resolution-block: (some block-height)
          })
        )
        
        (ok "claim-denied")
      )
    )
  )
)

(define-public (mint-fix-tokens (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (ft-mint? fix-token amount recipient)
  )
)