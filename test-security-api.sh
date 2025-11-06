# Security API Test Script

## Тест 1: BONK Token (известный безопасный токен)
curl -X POST http://localhost:3000/api/token-security \
  -H "Content-Type: application/json" \
  -d '{"tokenAddress": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"}'

## Тест 2: SOL (native token)
curl -X POST http://localhost:3000/api/token-security \
  -H "Content-Type: application/json" \
  -d '{"tokenAddress": "So11111111111111111111111111111111111111112"}'

## Тест 3: Ваш токен (замените ADDRESS на реальный адрес)
curl -X POST http://localhost:3000/api/token-security \
  -H "Content-Type: application/json" \
  -d '{"tokenAddress": "YOUR_TOKEN_ADDRESS_HERE"}'

## Ожидаемый ответ:
# {
#   "rugCheckScore": 0.85,
#   "isRugged": false,
#   "riskLevel": "LOW",
#   "risks": [
#     {
#       "level": "warn",
#       "name": "Example Risk",
#       "description": "Description of the risk",
#       "score": 0.5
#     }
#   ],
#   "authorities": {
#     "hasFreezeAuthority": false,
#     "hasMintAuthority": false
#   },
#   "holderConcentration": 23.5,
#   "liquidity": 500000,
#   "recommendation": "AI recommendation based on analysis",
#   "metadata": {
#     "name": "Token Name",
#     "symbol": "SYMBOL",
#     "supply": "1000000000"
#   }
# }
