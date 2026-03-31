"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import GuardPortalContent from "./guard-portal-content"

export default function GuardPortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>}>
      <GuardPortalWrapper />
    </Suspense>
  )
}

function GuardPortalWrapper() {
  const searchParams = useSearchParams()
  const tokenFromUrl = searchParams.get("token")

  return <GuardPortalContent tokenFromUrl={tokenFromUrl} />
}
