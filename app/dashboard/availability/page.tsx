import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import { AvailabilityEditor } from './availability-editor'

async function getAvailability(userId: string) {
  return await sql`
    SELECT * FROM availability
    WHERE user_id = ${userId}
    ORDER BY day_of_week, start_time
  `
}

export default async function AvailabilityPage() {
  const user = await getSession()
  if (!user) return null

  const availability = await getAvailability(user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Availability</h1>
        <p className="text-muted-foreground">
          Set your weekly availability for shift scheduling.
        </p>
      </div>

      <AvailabilityEditor initialAvailability={availability} />
    </div>
  )
}
