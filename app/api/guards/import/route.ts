import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import * as XLSX from "xlsx"

export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user || user.role === "guard") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const fileName = file.name.toLowerCase()
    let rows: Record<string, string>[] = []

    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      // Parse Excel file
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: "array" })
      // Use "Guards Import" sheet if it exists, otherwise first non-hidden sheet
      const sheetName = wb.SheetNames.find((n) => n === "Guards Import") ?? wb.SheetNames.find((n) => n !== "_Options") ?? wb.SheetNames[0]
      const ws = wb.Sheets[sheetName]

      // Detect if this is our structured template (row 2 contains [field_key] patterns)
      // If so: row1=labels, row2=keys, row3=notes, row4=example, row5+=data
      // Otherwise: row1=headers, row2+=data
      const raw = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" }) as string[][]

      let headers: string[] = []
      let dataStartRow = 1

      if (raw.length > 1 && raw[1].some((v) => /^\[.+\]$/.test(String(v)))) {
        // Structured template: extract field keys from row 2 (index 1), data from row 5 (index 4)
        headers = raw[1].map((v) => String(v).replace(/^\[|\]$/g, "").trim())
        dataStartRow = 4 // skip label, key, note, example rows
      } else {
        // Single header row — normalise labels to snake_case field keys
        // e.g. "First Name *" → "first_name", "Guard Title" → "guard_title"
        headers = raw[0].map((h) =>
          String(h)
            .replace(/\s*\*$/, "")
            .replace(/\s*\(.*?\)/g, "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^a-z0-9_]/g, "")
        )
        dataStartRow = 1
      }

      for (let r = dataStartRow; r < raw.length; r++) {
        const rowArr = raw[r]
        if (!rowArr || rowArr.every((v) => !String(v).trim())) continue
        const row: Record<string, string> = {}
        headers.forEach((h, idx) => { row[h] = String(rowArr[idx] ?? "").trim() })
        rows.push(row)
      }
    } else {
      // Parse CSV file
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#"))
      if (lines.length < 2) return NextResponse.json({ error: "File must have a header row and at least one data row" }, { status: 400 })
      const headers = lines[0].split(",").map((h) => h.trim().replace(/\s*\*$/, "").toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""))
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        if (values.every((v) => !v.trim())) continue
        const row: Record<string, string> = {}
        headers.forEach((h, idx) => { row[h] = (values[idx] || "").trim() })
        rows.push(row)
      }
    }

    if (rows.length === 0) return NextResponse.json({ error: "No data rows found" }, { status: 400 })

    // Check required columns exist — support both snake_case keys and normalised labels
    const firstRowKeys = Object.keys(rows[0])
    const hasFirst = firstRowKeys.includes("first_name") || firstRowKeys.includes("firstname")
    const hasLast  = firstRowKeys.includes("last_name")  || firstRowKeys.includes("lastname")
    if (!hasFirst || !hasLast) {
      return NextResponse.json({ error: "Missing required columns: first_name and last_name" }, { status: 400 })
    }

    const imported: string[] = []
    const skipped: { row: number; reason: string }[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const first_name = row["first_name"] || row["firstname"]
      const last_name = row["last_name"] || row["lastname"]

      if (!first_name || !last_name) {
        skipped.push({ row: i + 2, reason: "Missing first_name or last_name" })
        continue
      }

      const email = row["email"] || null
      const phone = row["phone"] || null
      const id_number = row["id_number"] || row["id"] || null
      const title = row["title"] || "Security Guard"
      const guard_title = row["guard_title"] || null
      const status = row["status"] || "recruitment"
      const gender = row["gender"] || null
      const education_level = row["education_level"] || null
      const discipline = row["discipline"] || "Excellent"
      const maternity_status = row["maternity_status"] || "Not Applicable"
            
      // Convert Excel serial date to ISO date string if needed
      let date_joined = row["date_joined"] || new Date().toISOString().split("T")[0]
      const dateNum = Number(date_joined)
      if (!isNaN(dateNum) && dateNum > 0) {
        // Excel serial number: days since 1900-01-01 (accounting for leap year bug)
        const excelDate = new Date((dateNum - 1) * 86400000 + new Date(1900, 0, 1).getTime())
        date_joined = excelDate.toISOString().split("T")[0]
      }
      

      const annual_leave_days = Number.parseInt(row["annual_leave_days"] || "21") || 21

      const languages_spoken = row["languages_spoken"]
        ? JSON.stringify(row["languages_spoken"].split("|").map((v) => v.trim()).filter(Boolean))
        : JSON.stringify([])
      const special_skills = row["special_skills"]
        ? JSON.stringify(row["special_skills"].split("|").map((v) => v.trim()).filter(Boolean))
        : JSON.stringify([])

      try {
        await sql`
          INSERT INTO guards (
            first_name, last_name, email, phone, title, guard_title, status,
            id_number, annual_leave_days, date_joined, hire_date,
            gender, education_level, discipline, maternity_status,
            languages_spoken, special_skills
          )
          VALUES (
            ${first_name}, ${last_name}, ${email}, ${phone}, ${title}, ${guard_title}, ${status},
            ${id_number}, ${annual_leave_days}, ${date_joined}, ${date_joined},
            ${gender}, ${education_level}, ${discipline}, ${maternity_status},
            ${languages_spoken}, ${special_skills}
          )
          ON CONFLICT (email) DO NOTHING
        `
        imported.push(`${first_name} ${last_name}`)
      } catch (err) {
        skipped.push({ row: i + 2, reason: String(err) })
      }
    }

    return NextResponse.json({ success: true, imported: imported.length, skipped: skipped.length, details: { imported, skipped } })
  } catch (error) {
    console.error("Import guards error:", error)
    return NextResponse.json({ error: "Failed to import guards" }, { status: 500 })
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === "," && !inQuotes) { result.push(current); current = "" }
    else { current += ch }
  }
  result.push(current)
  return result
}
