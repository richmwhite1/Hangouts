import { Suspense } from "react"
import { MergedDiscoveryPage } from "@/components/merged-discovery-page"

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MergedDiscoveryPage />
    </Suspense>
  )
}