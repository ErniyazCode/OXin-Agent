# Security API Test Script (PowerShell)
# Тестирование endpoint /api/token-security

Write-Host "=== Security API Tests ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: BONK Token (известный безопасный токен)
Write-Host "Test 1: Checking BONK token security..." -ForegroundColor Yellow
$bonkResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/token-security" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"tokenAddress": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"}'

Write-Host "BONK Results:" -ForegroundColor Green
Write-Host "  Risk Level: $($bonkResponse.riskLevel)"
Write-Host "  RugCheck Score: $($bonkResponse.rugCheckScore * 100)/100"
Write-Host "  Is Rugged: $($bonkResponse.isRugged)"
Write-Host "  Freeze Authority: $($bonkResponse.authorities.hasFreezeAuthority)"
Write-Host "  Mint Authority: $($bonkResponse.authorities.hasMintAuthority)"
Write-Host ""

# Test 2: SOL (native token)
Write-Host "Test 2: Checking SOL token security..." -ForegroundColor Yellow
try {
  $solResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/token-security" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{"tokenAddress": "So11111111111111111111111111111111111111112"}'
  
  Write-Host "SOL Results:" -ForegroundColor Green
  Write-Host "  Risk Level: $($solResponse.riskLevel)"
  Write-Host "  RugCheck Score: $($solResponse.rugCheckScore * 100)/100"
  Write-Host ""
} catch {
  Write-Host "SOL check failed (expected - native token)" -ForegroundColor Gray
  Write-Host ""
}

# Test 3: Custom token (замените на ваш токен)
Write-Host "Test 3: Check your own token..." -ForegroundColor Yellow
Write-Host "Replace 'YOUR_TOKEN_ADDRESS' in the script with actual token address" -ForegroundColor Gray
# Uncomment and replace address:
# $customResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/token-security" `
#   -Method Post `
#   -ContentType "application/json" `
#   -Body '{"tokenAddress": "YOUR_TOKEN_ADDRESS"}'
# Write-Host "Custom Token Results:" -ForegroundColor Green
# $customResponse | ConvertTo-Json -Depth 10

Write-Host ""
Write-Host "=== Tests Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Expected fields in response:" -ForegroundColor Yellow
Write-Host "  - rugCheckScore: number (0-1)"
Write-Host "  - isRugged: boolean"
Write-Host "  - riskLevel: LOW/MEDIUM/MODERATE/HIGH/CRITICAL"
Write-Host "  - risks: array of risk objects"
Write-Host "  - authorities: { hasFreezeAuthority, hasMintAuthority }"
Write-Host "  - holderConcentration: number (percentage)"
Write-Host "  - liquidity: number (USD)"
Write-Host "  - recommendation: string"
Write-Host "  - metadata: { name, symbol, supply }"
