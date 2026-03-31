import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { EmployeesList } from "./employees-list"

async function getGuards() {
  return await sql`
    SELECT * FROM guards ORDER BY first_name, last_name
  `
}

export default async function EmployeesPage() {
  const user = await getSession()
  if (!user) return null

  const guards = await getGuards()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Guards</h1>
        <p className="text-muted-foreground">
          Manage security guards and personnel.
        </p>
      </div>

      <EmployeesList initialGuards={guards} />
    </div>
  )
}
