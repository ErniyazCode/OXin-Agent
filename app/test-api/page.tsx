"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function TestAPIsPage() {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testDeepSeek = async () => {
    setTesting(true)
    setResult(null)

    try {
      const response = await fetch("/api/test-deepseek")
      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({
        success: false,
        error: "Network error",
        message: error.message,
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">API Testing Dashboard</h1>
            <p className="text-muted-foreground">Test your API integrations</p>
          </div>
          <Link href="/analyzer">
            <Button variant="outline">Back to Analyzer</Button>
          </Link>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">DeepSeek AI API</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Test your DeepSeek API key configuration
                </p>
              </div>
              <Button onClick={testDeepSeek} disabled={testing} className="gap-2">
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test API"
                )}
              </Button>
            </div>

            {result && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3">
                  {result.success ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-green-500" />
                      <div>
                        <p className="font-semibold text-green-500">API Working! ✅</p>
                        <p className="text-sm text-muted-foreground">
                          DeepSeek AI is properly configured
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6 text-red-500" />
                      <div>
                        <p className="font-semibold text-red-500">API Error ❌</p>
                        <p className="text-sm text-muted-foreground">
                          {result.error || "Unknown error"}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <Card className="p-4 bg-muted/50">
                  <div className="space-y-3">
                    {result.success && result.response && (
                      <div>
                        <p className="text-sm font-semibold mb-2">AI Response:</p>
                        <p className="text-sm bg-background p-3 rounded border">{result.response}</p>
                      </div>
                    )}

                    {result.apiKey && (
                      <div>
                        <p className="text-sm font-semibold mb-1">API Key:</p>
                        <code className="text-xs bg-background p-2 rounded border block">
                          {result.apiKey}
                        </code>
                      </div>
                    )}

                    {result.model && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Model: {result.model}</Badge>
                      </div>
                    )}

                    {result.usage && (
                      <div>
                        <p className="text-sm font-semibold mb-1">Token Usage:</p>
                        <div className="flex gap-4 text-xs">
                          <span>Prompt: {result.usage.prompt_tokens}</span>
                          <span>Completion: {result.usage.completion_tokens}</span>
                          <span>Total: {result.usage.total_tokens}</span>
                        </div>
                      </div>
                    )}

                    {result.details && (
                      <div>
                        <p className="text-sm font-semibold mb-2 text-red-500">Error Details:</p>
                        <pre className="text-xs bg-background p-3 rounded border overflow-auto max-h-60">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </div>
                    )}

                    {result.message && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground">
                          <AlertCircle className="w-4 h-4 inline mr-1" />
                          {result.message}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                {!result.success && (
                  <Card className="p-4 bg-yellow-500/10 border-yellow-500/50">
                    <p className="text-sm font-semibold mb-2">💡 Troubleshooting:</p>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>Check if DEEPSEEK_API_KEY is set in .env.local</li>
                      <li>Verify your API key is valid at platform.deepseek.com</li>
                      <li>Restart the dev server after adding the key</li>
                      <li>Check if you have API credits remaining</li>
                    </ul>
                  </Card>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 bg-blue-500/10 border-blue-500/50">
          <h3 className="font-semibold mb-2">📝 Environment Variables</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Add these to your <code className="bg-background px-2 py-1 rounded">.env.local</code> file:
          </p>
          <pre className="text-xs bg-background p-4 rounded overflow-auto">
            {`# AI Analysis (Required for portfolio analysis)
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# Solana RPC (Required)
HELIUS_API_KEY=your_helius_key_here
GETBLOCK_ACCESS_TOKEN=your_getblock_token_here

# Price APIs (Recommended)
COINGECKO_API_KEY=your_coingecko_key_here
COINMARKETCAP_API_KEY=your_coinmarketcap_key_here

# Optional Advanced Features
BIRDEYE_API_KEY=your_birdeye_key_here
SOLSCAN_API_KEY=your_solscan_key_here
SOLANASTREAMING_API_KEY=your_streaming_key_here`}
          </pre>
        </Card>
      </div>
    </div>
  )
}
