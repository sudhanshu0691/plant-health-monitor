"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { Mic, MicOff, Send, User } from "lucide-react"

const GROQ_MODEL = "moonshotai/kimi-k2-instruct-0905"

type ChatMessage = {
  text: string
  sender: "user" | "bot"
}

export default function VoicePlantChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      text: "🌱 Hello! I’m your AI plant expert. Tell me about your plant or ask anything.",
      sender: "bot",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)

  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (typeof window === "undefined") return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceError("🎤 Your browser does not support voice recognition.")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = "en-US"
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)

    recognition.onresult = (event: any) => {
      let finalTranscript = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) finalTranscript += transcript + " "
      }
      if (finalTranscript) {
        setInput((prev) => (prev ? prev + " " + finalTranscript.trim() : finalTranscript.trim()))
      }
    }

    recognition.onerror = (e: any) => {
      console.error("Speech recognition error:", e)
      setVoiceError("🎙 Voice recognition failed. Try again.")
      setIsListening(false)
    }

    recognitionRef.current = recognition
  }, [])

  const toggleVoice = () => {
    const recognition = recognitionRef.current
    if (!recognition) {
      setVoiceError("Speech recognition not available")
      setTimeout(() => setVoiceError(null), 3000)
      return
    }
    if (isListening) {
      recognition.stop()
    } else {
      setVoiceError(null)
      try {
        recognition.start()
      } catch (e) {
        console.warn("Failed to start recognition:", e)
        setVoiceError("Could not start microphone")
        setTimeout(() => setVoiceError(null), 3000)
      }
    }
  }

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) return
      setMessages((prev) => [...prev, { text: message, sender: "user" }])
      setInput("")
      setIsLoading(true)

      try {
        // Call server-side proxy to keep API key secret
        const response = await fetch("/api/groq-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful AI assistant for plant health, care, and farming advice. Keep answers friendly and useful.",
              },
              { role: "user", content: message },
            ],
          }),
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          throw new Error(err.error?.message || `HTTP ${response.status}`)
        }

        const data = await response.json()
        const aiText = data.choices?.[0]?.message?.content || "🤖 Sorry, I couldn’t understand that."
        setMessages((prev) => [...prev, { text: aiText, sender: "bot" }])
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          { text: `⚠ ${err?.message || "Failed to fetch response"}`, sender: "bot" },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-green-50 to-white py-10 px-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg border border-green-100 flex flex-col">
        <div className="flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-t-2xl">
          <span className="text-lg">🤖</span>
          <h2 className="font-semibold text-lg">AI Farming Assistant</h2>
        </div>

        <div id="chat-messages-scroll" className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: "60vh" }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`rounded-xl px-4 py-2 text-sm shadow ${
                  msg.sender === "user"
                    ? "bg-green-600 text-white rounded-br-none"
                    : "bg-gray-100 text-gray-800 rounded-bl-none"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-xl animate-pulse">Typing...</div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div className="border-t p-3 flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type or speak your question..."
            className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button
            onClick={toggleVoice}
            className={`p-2 rounded-lg border ${
              isListening
                ? "bg-red-600 text-white border-red-600"
                : "bg-white border-gray-300 text-gray-700 hover:bg-green-50"
            }`}
            title={isListening ? "Stop listening" : "Start voice"}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-1"
          >
            <Send className="w-4 h-4" /> Send
          </button>
        </div>

        {voiceError && (
          <div className="text-red-600 text-sm p-2 text-center bg-red-50 border-t border-red-100">{voiceError}</div>
        )}
        {isListening && (
          <div className="text-blue-600 text-sm p-2 text-center bg-blue-50 border-t border-blue-100 animate-pulse">
            🎙 Listening... Speak now
          </div>
        )}
      </div>
    </div>
  )
}
