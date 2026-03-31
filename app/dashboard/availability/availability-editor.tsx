'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Save, Loader2 } from 'lucide-react'

interface Availability {
  id: string
  user_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
}

interface AvailabilityEditorProps {
  initialAvailability: Availability[]
}

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function AvailabilityEditor({ initialAvailability }: AvailabilityEditorProps) {
  const [availability, setAvailability] = useState<
    Record<number, { isAvailable: boolean; startTime: string; endTime: string }>
  >(() => {
    const initial: Record<number, { isAvailable: boolean; startTime: string; endTime: string }> = {}
    
    for (let i = 0; i < 7; i++) {
      const existing = initialAvailability.find((a) => a.day_of_week === i)
      if (existing) {
        initial[i] = {
          isAvailable: existing.is_available,
          startTime: existing.start_time.slice(0, 5),
          endTime: existing.end_time.slice(0, 5),
        }
      } else {
        initial[i] = {
          isAvailable: true,
          startTime: '08:00',
          endTime: '20:00',
        }
      }
    }
    
    return initial
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setLoading(true)
    setSaved(false)
    
    try {
      const data = Object.entries(availability).map(([day, avail]) => ({
        day_of_week: parseInt(day),
        start_time: avail.startTime,
        end_time: avail.endTime,
        is_available: avail.isAvailable,
      }))

      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: data }),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Failed to save availability:', error)
    } finally {
      setLoading(false)
    }
  }

  function updateDay(
    day: number,
    field: 'isAvailable' | 'startTime' | 'endTime',
    value: boolean | string
  ) {
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }))
  }

  function formatHour(hour: number) {
    if (hour === 0) return '12:00 AM'
    if (hour < 12) return `${hour}:00 AM`
    if (hour === 12) return '12:00 PM'
    return `${hour - 12}:00 PM`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Availability</CardTitle>
        <CardDescription>
          Toggle days on/off and set your available hours for each day.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {DAYS.map((day, index) => (
          <div
            key={day}
            className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-4">
              <Switch
                checked={availability[index]?.isAvailable ?? true}
                onCheckedChange={(checked) =>
                  updateDay(index, 'isAvailable', checked)
                }
              />
              <Label className="w-24 font-medium">{day}</Label>
            </div>

            {availability[index]?.isAvailable && (
              <div className="flex items-center gap-2">
                <Select
                  value={availability[index]?.startTime || '08:00'}
                  onValueChange={(value) => updateDay(index, 'startTime', value)}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.map((hour) => (
                      <SelectItem
                        key={hour}
                        value={`${hour.toString().padStart(2, '0')}:00`}
                      >
                        {formatHour(hour)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground">to</span>
                <Select
                  value={availability[index]?.endTime || '20:00'}
                  onValueChange={(value) => updateDay(index, 'endTime', value)}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.map((hour) => (
                      <SelectItem
                        key={hour}
                        value={`${hour.toString().padStart(2, '0')}:00`}
                      >
                        {formatHour(hour)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!availability[index]?.isAvailable && (
              <span className="text-sm text-muted-foreground">Not available</span>
            )}
          </div>
        ))}

        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            {saved && 'Availability saved successfully!'}
          </p>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Availability
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
