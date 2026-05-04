'use client'

import { useCallback, useState } from 'react'
import arm64 from '@/lib/arm64'

const { asmToHex, hexToAsm } = arm64

export default function Converter() {
  const [mode, setMode] = useState('asm-to-hex')
  const [architecture, setArchitecture] = useState('arm64')
  const [inputValue, setInputValue] = useState('')
  const [outputValue, setOutputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConvert = useCallback(() => {
    if (!inputValue.trim()) {
      setError('Please enter some input')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (architecture !== 'arm64') {
        throw new Error('This browser-only build currently supports ARM64 only')
      }

      const output = mode === 'asm-to-hex' ? asmToHex(inputValue) : hexToAsm(inputValue)
      setOutputValue(output)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
      setOutputValue('')
    } finally {
      setLoading(false)
    }
  }, [architecture, inputValue, mode])

  const toggleMode = () => {
    setMode((currentMode) => (currentMode === 'asm-to-hex' ? 'hex-to-asm' : 'asm-to-hex'))
    const temp = inputValue
    setInputValue(outputValue)
    setOutputValue(temp)
    setError('')
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#e2e8f0_45%,_#cbd5e1_100%)] p-6 text-slate-950 dark:bg-[radial-gradient(circle_at_top,_#0f172a_0%,_#111827_45%,_#020617_100%)] dark:text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-4xl font-bold tracking-tight sm:text-5xl">
            ARM Assembly Converter
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-slate-600 dark:text-slate-400 sm:text-base">
            Convert AArch64 assembly to hex and back.
          </p>
        </div>

        <div className="mb-6 rounded-3xl border border-slate-300/80 bg-white/80 p-4 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/70">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Architecture
              </label>
              <select
                value={architecture}
                onChange={(e) => setArchitecture(e.target.value)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-400/40 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white"
              >
                <option value="arm64">ARM64 (AArch64)</option>
                <option value="arm32" disabled>
                  ARM32 (browser engine pending)
                </option>
                <option value="thumb" disabled>
                  Thumb (browser engine pending)
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Mode
              </label>
              <div className="inline-flex rounded-2xl border border-slate-300 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-950/70">
                <button
                  onClick={() => setMode('asm-to-hex')}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    mode === 'asm-to-hex'
                      ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  ASM → HEX
                </button>
                <button
                  onClick={() => setMode('hex-to-asm')}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    mode === 'hex-to-asm'
                      ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  HEX → ASM
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-3xl border border-slate-300/80 bg-white/85 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/70">
            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                {mode === 'asm-to-hex' ? 'Assembly' : 'Hexadecimal'}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {mode === 'asm-to-hex'
                  ? 'Enter AArch64 instructions, one per line or separated by semicolons.'
                  : 'Enter 4-byte instruction words as space or comma separated hex bytes.'}
              </p>
            </div>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                mode === 'asm-to-hex'
                  ? 'mov x0, x1\nadd x2, x2, #4\nret'
                  : 'E0 03 01 AA\n42 10 00 91\nC0 03 5F D6'
              }
              className="h-72 w-full resize-none border-0 bg-slate-50 p-6 font-mono text-sm text-slate-950 outline-none placeholder:text-slate-400 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-col">
            <div className="mb-6 flex gap-3">
              <button
                onClick={handleConvert}
                disabled={loading}
                className="flex-1 rounded-2xl bg-slate-950 px-6 py-4 font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {loading ? 'Converting...' : 'Convert'}
              </button>
              <button
                onClick={toggleMode}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-4 font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Swap
              </button>
            </div>

            <div className="flex min-h-[24rem] flex-1 flex-col overflow-hidden rounded-3xl border border-slate-300/80 bg-white/85 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/70">
              <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  {mode === 'asm-to-hex' ? 'Hexadecimal' : 'Assembly'}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {mode === 'asm-to-hex'
                    ? 'Encoded machine code as little-endian bytes.'
                    : 'Decoded AArch64 mnemonics from raw instruction words.'}
                </p>
              </div>
              <textarea
                value={outputValue}
                readOnly
                className="min-h-72 flex-1 resize-none border-0 bg-slate-50 p-6 font-mono text-sm text-slate-950 outline-none cursor-default dark:bg-slate-950/60 dark:text-white"
              />
              {outputValue && (
                <div className="border-t border-slate-200 px-6 py-3 dark:border-slate-800">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(outputValue)
                    }}
                    className="text-sm font-medium text-slate-700 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
                  >
                    Copy to clipboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="mt-10 text-center text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-500">
          Powered by an ARM64 encoder/decoder
        </div>
      </div>
    </div>
  )
}
