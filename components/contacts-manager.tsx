"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Plus, Trash2, Edit2, Check } from "lucide-react"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Contact {
  id: number
  contact_person: string | null
  contact_email: string | null
  contact_phone: string | null
  is_primary: boolean
}

interface ContactsManagerProps {
  entityId: number
  entityType: "client" | "site"
  title?: string
}

export function ContactsManager({ entityId, entityType, title = "Contacts" }: ContactsManagerProps) {
  const apiUrl = entityType === "client" ? `/api/client-contacts?client_id=${entityId}` : `/api/site-contacts?site_id=${entityId}`
  const { data: contacts = [], isLoading } = useSWR<Contact[]>(apiUrl, fetcher)

  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ contact_person: "", contact_email: "", contact_phone: "", is_primary: false })
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    if (!formData.contact_person?.trim()) {
      toast.error("Contact person name is required")
      return
    }

    setSaving(true)
    try {
      const endpoint = entityType === "client" ? "/api/client-contacts" : "/api/site-contacts"
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [`${entityType}_id`]: entityId,
          ...formData,
        }),
      })

      if (res.ok) {
        toast.success("Contact added successfully")
        setFormData({ contact_person: "", contact_email: "", contact_phone: "", is_primary: false })
        setIsAdding(false)
        mutate(apiUrl)
      } else {
        toast.error("Failed to add contact")
      }
    } catch {
      toast.error("Error adding contact")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id: number) => {
    setSaving(true)
    try {
      const endpoint = entityType === "client" ? `/api/client-contacts/${id}` : `/api/site-contacts/${id}`
      const contact = contacts.find((c) => c.id === id)
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_person: formData.contact_person || contact?.contact_person,
          contact_email: formData.contact_email || contact?.contact_email,
          contact_phone: formData.contact_phone || contact?.contact_phone,
          is_primary: formData.is_primary || contact?.is_primary,
        }),
      })

      if (res.ok) {
        toast.success("Contact updated successfully")
        setEditingId(null)
        setFormData({ contact_person: "", contact_email: "", contact_phone: "", is_primary: false })
        mutate(apiUrl)
      } else {
        toast.error("Failed to update contact")
      }
    } catch {
      toast.error("Error updating contact")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setSaving(true)
    try {
      const endpoint = entityType === "client" ? `/api/client-contacts/${deleteId}` : `/api/site-contacts/${deleteId}`
      const res = await fetch(endpoint, { method: "DELETE" })

      if (res.ok) {
        toast.success("Contact deleted successfully")
        setDeleteId(null)
        mutate(apiUrl)
      } else {
        toast.error("Failed to delete contact")
      }
    } catch {
      toast.error("Error deleting contact")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {!isAdding && (
          <Button size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Name</Label>
                <Input
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Contact person name"
                />
              </div>
              <div>
                <Label className="text-sm">Email</Label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label className="text-sm">Phone</Label>
                <Input
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_primary}
                    onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Primary</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving}>
                {saving ? "Adding..." : "Add"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsAdding(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No contacts added yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>{contact.contact_person || "-"}</TableCell>
                  <TableCell className="text-sm">{contact.contact_email || "-"}</TableCell>
                  <TableCell>{contact.contact_phone || "-"}</TableCell>
                  <TableCell>{contact.is_primary ? <Badge>Primary</Badge> : <Badge variant="outline">Secondary</Badge>}</TableCell>
                  <TableCell className="text-right flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(contact.id)
                        setFormData({
                          contact_person: contact.contact_person || "",
                          contact_email: contact.contact_email || "",
                          contact_phone: contact.contact_phone || "",
                          is_primary: contact.is_primary,
                        })
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteId(contact.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {editingId && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
            <h4 className="font-medium">Edit Contact</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Name</Label>
                <Input
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Contact person name"
                />
              </div>
              <div>
                <Label className="text-sm">Email</Label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label className="text-sm">Phone</Label>
                <Input
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_primary}
                    onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Primary</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleUpdate(editingId)} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingId(null)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Contact</AlertDialogTitle>
              <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
