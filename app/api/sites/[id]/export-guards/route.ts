import { NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const siteId = Number(id)

    if (!siteId) {
      return NextResponse.json({ error: "Site ID required" }, { status: 400 })
    }

    // Fetch site details and all guards assigned to it
    const guardsResult = await sql`
      SELECT 
        a.id,
        g.first_name,
        g.last_name,
        g.phone,
        g.email,
        s.shift_name,
        a.date_from,
        a.date_to,
        a.status,
        EXTRACT(DAY FROM a.date_to::date - a.date_from::date) + 1 as days_assigned,
        site.name as site_name,
        c.name as client_name
      FROM assignments a
      JOIN guards g ON a.guard_id = g.id
      JOIN shifts s ON a.shift_id = s.id
      JOIN sites site ON a.site_id = site.id
      LEFT JOIN clients c ON site.client_id = c.id
      WHERE a.site_id = $1
      ORDER BY a.date_from DESC
    ` as any

    const guards = guardsResult.rows

    // Generate Excel file using a simple library approach
    // We'll create a CSV that Excel can read, then convert to XLSX format
    const headers = [
      "Guard Name",
      "Phone",
      "Email",
      "Shift",
      "Start Date",
      "End Date",
      "Days Assigned",
      "Status",
    ]

    // Create CSV content
    const rows = guards.map((g: any) => [
      `${g.first_name} ${g.last_name}`,
      g.phone || "",
      g.email || "",
      g.shift_name || "",
      new Date(g.date_from).toLocaleDateString(),
      new Date(g.date_to).toLocaleDateString(),
      g.days_assigned || 0,
      g.status || "",
    ])

    // For now, we'll create a more sophisticated Excel export using a simple approach
    // Create XML for Excel format
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Data">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Guards">
  <Table>
   <Column ss:Width="150"/>
   <Column ss:Width="120"/>
   <Column ss:Width="180"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="80"/>
   <Row>
`

    const headerRow = headers
      .map((h) => `    <Cell ss:StyleID="Header"><Data ss:Type="String">${h}</Data></Cell>`)
      .join("\n")

    const dataRows = rows
      .map(
        (row) => `   <Row>
${row
  .map((cell) => `    <Cell ss:StyleID="Data"><Data ss:Type="String">${String(cell).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</Data></Cell>`)
  .join("\n")}
   </Row>`,
      )
      .join("\n")

    const xmlFooter = `   </Row>
  </Table>
 </Worksheet>
</Workbook>`

    const xmlContent = xmlHeader + headerRow + "\n" + dataRows + "\n" + xmlFooter

    // Return as Excel file
    return new NextResponse(xmlContent, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="scheduled_guards.xlsx"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Failed to export guards" }, { status: 500 })
  }
}
