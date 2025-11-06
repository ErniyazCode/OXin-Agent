"use client"

import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input"

export function PlaceholdersAndVanishInputDemo() {
  const placeholders = [
    "What's the first rule of Fight Club?",
    "Who is Tyler Durden?",
    "Where is Andrew Laeddis hiding?",
    "Write a JavaScript method to reverse a string",
    "How to assemble your own PC?",
  ]

  const handleChange = (_event: React.ChangeEvent<HTMLInputElement>) => {}

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
  }

  return (
    <div className="flex h-[40rem] flex-col items-center justify-center px-4">
      <h2 className="mb-10 text-center text-xl text-black dark:text-white sm:mb-20 sm:text-5xl">
        Ask Aceternity UI Anything
      </h2>
      <PlaceholdersAndVanishInput placeholders={placeholders} onChange={handleChange} onSubmit={handleSubmit} />
    </div>
  )
}
