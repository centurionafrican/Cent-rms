import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getSession()
    if (!user || user.role === "guard") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const guards = await sql`
      SELECT 
        ROW_NUMBER() OVER (ORDER BY first_name, last_name) AS "#",
        first_name,
        last_name,
        email,
        phone,
        address,
        gender,
        id_number,
        title,
        guard_title,
        status,
        employment_status,
        date_joined,
        hire_date,
        education_level,
        discipline,
        languages_spoken,
        special_skills,
        maternity_status,
        annual_leave_days,
        leave_days_used,
        created_at,
        updated_at
      FROM guards
      ORDER BY first_name, last_name
    `

    const headers = [
      "#",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Address",
      "Gender",
      "ID Number",
      "Job Title",
      "Guard Title",
      "Status",
      "Employment Status",
      "Date Joined",
      "Hire Date",
      "Education Level",
      "Discipline Level",
      "Languages Spoken",
      "Special Skills",
      "Maternity Status",
      "Annual Leave Days",
      "Leave Days Used",
      "Created At",
      "Updated At",
    ]

    const rows = guards.map(g => [
      g["#"],
      g.first_name,
      g.last_name,
      g.email || "",
      g.phone || "",
      g.address || "",
      g.gender || "",
      g.id_number || "",
      g.title || "",
      g.guard_title || "",
      g.status || "",
      g.employment_status || "",
      g.date_joined || "",
      g.hire_date || "",
      g.education_level || "",
      g.discipline || "",
      Array.isArray(g.languages_spoken) ? g.languages_spoken.join(", ") : g.languages_spoken || "",
      Array.isArray(g.special_skills) ? g.special_skills.join(", ") : g.special_skills || "",
      g.maternity_status || "",
      g.annual_leave_days ?? "",
      g.leave_days_used ?? "",
      g.created_at || "",
      g.updated_at || "",
    ])

    const csv = [
      headers.join(","),
      ...rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
    ].join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=guards-report-${new Date().toISOString().split("T")[0]}.csv`
      }
    })
  } catch (error) {
    console.error("Error generating guards report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
