"use client"

import { MonthCalendarView } from "@/components/planner/month-calendar-view"
import { useState, useEffect } from "react"

export default function CalendarPage() {
    // Placeholder data or fetch real data
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(false)

    return (
        <div className="min-h-screen bg-planner-cream pb-20 pt-safe">
            <div className="px-4 py-4">
                <h1 className="text-2xl font-bold text-planner-text-primary text-center mb-6">Calendar</h1>
                <MonthCalendarView items={items} loading={loading} />
            </div>
        </div>
    )
}
