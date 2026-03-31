'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function AdminSetupPage() {
  const [email, setEmail] = useState('u.angeclairette@centurionafrica.rw')
  const [password, setPassword] = useState('CAL@2025!')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSetup() {
    setLoading(true)
    setMessage('')
    setError('')
    setSuccess(false)

    try {
      console.log('[v0] Attempting admin setup with email:', email)
      
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      console.log('[v0] Admin setup response:', res.status, data)

      if (res.ok) {
        setSuccess(true)
        setMessage(data.message || 'Admin credentials updated successfully! You can now login.')
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
      } else {
        setError(data.error || 'Failed to update admin credentials')
      }
    } catch (err) {
      console.error('[v0] Admin setup error:', err)
      setError('An error occurred. Please try again. Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
          <CardTitle className="text-2xl">System Administrator Setup</CardTitle>
          <CardDescription className="text-blue-100">
            Configure admin login credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-green-300 bg-green-50">
              <AlertDescription className="text-green-800 font-semibold">✓ {message}</AlertDescription>
            </Alert>
          )}
          {message && !success && (
            <Alert className="border-blue-300 bg-blue-50">
              <AlertDescription className="text-blue-800">{message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold">Administrator Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              disabled={loading}
              className="border-2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter secure password"
              disabled={loading}
              className="border-2"
            />
          </div>

          <Button 
            onClick={handleSetup} 
            disabled={loading || !email || !password} 
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2"
          >
            {loading ? 'Setting up...' : 'Update Admin Credentials'}
          </Button>

          <div className="text-xs text-slate-500 bg-slate-100 p-3 rounded">
            After clicking the button, you'll be redirected to login with your new credentials.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
