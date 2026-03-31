import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import { redirect } from 'next/navigation'
import { LocationsList } from './locations-list'

async function getLocations() {
  return await sql`
    SELECT * FROM locations
    ORDER BY name
  `
}

export default async function LocationsPage() {
  const user = await getSession()
  if (!user) return null

  if (user.role === 'employee') {
    redirect('/dashboard')
  }

  const locations = await getLocations()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Locations</h1>
        <p className="text-muted-foreground">
          Manage security post locations and sites.
        </p>
      </div>

      <LocationsList initialLocations={locations} isAdmin={user.role === 'admin'} />
    </div>
  )
}
