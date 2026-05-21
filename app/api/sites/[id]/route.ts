import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sites = await sql`SELECT * FROM sites WHERE id = ${id}`

    if (sites.length === 0) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 })
    }

    // Get posts for this site
    const posts = await sql`SELECT * FROM posts WHERE site_id = ${id} ORDER BY name`

    return NextResponse.json({ ...sites[0], posts: posts || [] })
  } catch (error) {
    console.error("Error fetching site:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, address, contact_person, contact_phone, is_active, client_id, site_status, guards_needed, posts } = body

    const result = await sql`
      UPDATE sites SET
        name = ${name},
        address = ${address || null},
        contact_person = ${contact_person || null},
        contact_phone = ${contact_phone || null},
        is_active = ${is_active !== false},
        client_id = ${client_id || null},
        site_status = ${site_status || 'active'},
        guards_needed = ${guards_needed || 1},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 })
    }

    // Handle posts update if provided
    if (posts && Array.isArray(posts)) {
      // Delete old posts and add new ones
      await sql`DELETE FROM posts WHERE site_id = ${id}`
      
      for (const post of posts) {
        if (post.name) {  // Only create if name exists
          await sql`
            INSERT INTO posts (site_id, name, post_type, status)
            VALUES (${id}, ${post.name}, ${post.post_type || null}, 'active')
          `
        }
      }
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating site:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    const { id } = await params

    await sql`DELETE FROM sites WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting site:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
