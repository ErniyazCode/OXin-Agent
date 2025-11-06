import { NextResponse } from "next/server"

/**
 * Test DeepSeek API connection and functionality
 * GET /api/test-deepseek
 */
export async function GET() {
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: "DEEPSEEK_API_KEY not configured",
      message: "Please add your DeepSeek API key to .env.local",
    })
  }

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant. Reply with a brief greeting.",
          },
          {
            role: "user",
            content: "Hello! Please confirm you're working.",
          },
        ],
        temperature: 0.7,
        max_tokens: 100,
      }),
    })

    const responseText = await response.text()

    if (!response.ok) {
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch {
        errorData = { raw: responseText }
      }

      return NextResponse.json({
        success: false,
        error: "API request failed",
        status: response.status,
        statusText: response.statusText,
        details: errorData,
        apiKey: `${apiKey.slice(0, 10)}...${apiKey.slice(-4)}`,
      })
    }

    const data = JSON.parse(responseText)

    return NextResponse.json({
      success: true,
      message: "DeepSeek API is working correctly",
      response: data.choices[0]?.message?.content,
      model: data.model,
      usage: data.usage,
      apiKey: `${apiKey.slice(0, 10)}...${apiKey.slice(-4)}`,
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: "Request failed",
      message: error.message,
      stack: error.stack,
    })
  }
}
