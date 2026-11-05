import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const sites = await sql`
      SELECT s.*, c.name as client_name,
        (SELECT COUNT(*)::int FROM posts p WHERE p.site_id = s.id AND COALESCE(p.status, 'active') = 'active') AS posts_available
      FROM sites s
      LEFT JOIN clients c ON c.id = s.client_id
      ORDER BY s.name
    `
    return NextResponse.json(sites)
  } catch (error) {
    console.error("Error fetching sites:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, province, district, sector, contact_person, contact_phone, is_active, client_id, site_status, guards_needed, arms_needed, posts } = body

    if (!name) {
      return NextResponse.json({ error: "Site name is required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO sites (name, province, district, sector, contact_person, contact_phone, is_active, client_id, site_status, guards_needed, arms_needed)
      VALUES (${name}, ${province || null}, ${district || null}, ${sector || null}, ${contact_person || null}, ${contact_phone || null}, ${is_active !== false}, ${client_id || null}, ${site_status || 'active'}, ${guards_needed || 1}, ${Math.max(0, Number(arms_needed) || 0)})
      RETURNING *
    `

    const siteId = result[0].id

    // Create posts if provided
    if (posts && Array.isArray(posts) && posts.length > 0) {
      for (const post of posts) {
        await sql`
          INSERT INTO posts (site_id, name, post_type)
          VALUES (${siteId}, ${post.name}, ${post.post_type || null})
        `
      }
    }

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating site:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
