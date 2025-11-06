"use client"

import { useCallback, useEffect, useState } from "react"

type ConnectHandler = () => Promise<string | null>

declare global {
  interface Window {
    solana?: PhantomProvider
  }
}

export interface PhantomProvider {
  isPhantom?: boolean
  connect: () => Promise<{ publicKey: { toString: () => string } }>
  disconnect: () => Promise<void>
  on: (event: string, callback: () => void) => void
  removeListener?: (event: string, callback: () => void) => void
  publicKey: { toString: () => string } | null
}

export function usePhantomWallet() {
  const [connected, setConnected] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [walletError, setWalletError] = useState<string | null>(null)

  const checkExistingConnection = useCallback(() => {
    if (window.solana?.publicKey) {
      setConnected(true)
      setPublicKey(window.solana.publicKey.toString())
    }
  }, [])

  useEffect(() => {
    checkExistingConnection()

    const provider = window.solana
    if (!provider) return

    const handleConnect = () => {
      if (provider.publicKey) {
        setConnected(true)
        setPublicKey(provider.publicKey.toString())
        setWalletError(null)
      }
    }

    const handleDisconnect = () => {
      setConnected(false)
      setPublicKey(null)
    }

    provider.on?.("connect", handleConnect)
    provider.on?.("disconnect", handleDisconnect)

    return () => {
      provider.removeListener?.("connect", handleConnect)
      provider.removeListener?.("disconnect", handleDisconnect)
    }
  }, [checkExistingConnection])

  const connectWallet: ConnectHandler = useCallback(async () => {
    if (!window.solana) {
      const message = "Phantom wallet not found. Please install Phantom wallet extension."
      setWalletError(message)
      window.open("https://phantom.app/", "_blank")
      throw new Error(message)
    }

    try {
      const response = await window.solana.connect()
      const address = response.publicKey.toString()
      setConnected(true)
      setPublicKey(address)
      setWalletError(null)
      return address
    } catch (error: any) {
      const message = error?.message?.includes("User rejected")
        ? "Wallet connection rejected. Please approve the connection in your wallet."
        : "Failed to connect wallet. Please try again."
      setWalletError(message)
      throw new Error(message)
    }
  }, [])

  const disconnectWallet = useCallback(async () => {
    if (!window.solana) return
    try {
      await window.solana.disconnect()
      setConnected(false)
      setPublicKey(null)
    } catch (_error) {
      setWalletError("Failed to disconnect wallet. Please try again.")
    }
  }, [])

  const clearWalletError = useCallback(() => setWalletError(null), [])

  return {
    connected,
    publicKey,
    connectWallet,
    disconnectWallet,
    walletError,
    clearWalletError,
  }
}
