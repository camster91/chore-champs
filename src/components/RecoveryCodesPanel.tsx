'use client'

import { useState } from 'react'
import { KeyRound, Copy, Check, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { Card, CardContent, Button } from '@/components/ui'
import { generateRecoveryCodes } from '@/actions/recoveryCodes'

export function RecoveryCodesPanel() {
  const [codes, setCodes] = useState<string[] | null>(null)
  const [expireAt, setExpireAt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [showCodes, setShowCodes] = useState(true)
  const [acknowledged, setAcknowledged] = useState(false)

  async function handleGenerate() {
    setIsGenerating(true)
    setError('')
    const result = await generateRecoveryCodes()
    setIsGenerating(false)

    if ('error' in result) {
      setError(result.error)
      return
    }

    setCodes(result.codes)
    setExpireAt(result.expireAt)
    setAcknowledged(false)
  }

  function handleCopy(index: number) {
    if (!codes) return
    navigator.clipboard.writeText(codes[index])
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  function handleCopyAll() {
    if (!codes) return
    navigator.clipboard.writeText(codes.join('\n'))
    setCopiedIndex(-1)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Recovery Codes
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              isLoading={isGenerating}
              disabled={isGenerating}
            >
              {codes ? 'Regenerate' : 'Generate'} Codes
            </Button>
          </div>

          <p className="text-gray-600 mb-4">
            If you forget your password, these single-use codes let you reset it
            instantly — no email required. Save them somewhere safe, like your phone
            notes or a password manager.
          </p>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {codes && (
            <>
              {!acknowledged ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-800 font-medium mb-1">
                        This is the only time you will see these codes.
                      </p>
                      <p className="text-amber-700 text-sm mb-3">
                        Copy and save them now. They will never be displayed again.
                        Each code can only be used once.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setAcknowledged(true)}
                      >
                        I have saved my codes
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Expires: {new Date(expireAt).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCodes(!showCodes)}
                        leftIcon={showCodes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      >
                        {showCodes ? 'Hide' : 'Show'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyAll}
                        leftIcon={copiedIndex === -1 ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      >
                        {copiedIndex === -1 ? 'Copied' : 'Copy All'}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {codes.map((code, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm"
                      >
                        <span className={showCodes ? '' : 'blur select-none'}>
                          {showCodes ? code : 'XXXX-XXXX-XXXX-XXXX'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(i)}
                        >
                          {copiedIndex === i ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
