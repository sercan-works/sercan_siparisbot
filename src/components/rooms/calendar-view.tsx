"use client"

import { useState, useEffect } from "react"
import { format, addMonths, subMonths, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, getDay } from "date-fns"
import { tr } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus, Loader2, Calendar as CalIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PriceRuleDialog } from "./price-rule-dialog"
import { Badge } from "@/components/ui/badge"

// Types
interface CalendarData {
    id: string
    name: string
    data: {
        date: string
        isBlocked: boolean
        price: number
        stock: number
        ruleName?: string | null
    }[]
}

export default function CalendarView() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [calendarData, setCalendarData] = useState<CalendarData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [activeRuleDialog, setActiveRuleDialog] = useState<string | null>(null)

    const fetchCalendar = async () => {
        setIsLoading(true)
        try {
            const dateStr = format(currentDate, "yyyy-MM-dd")
            const res = await fetch(`/api/rooms/calendar?date=${dateStr}`)
            const data = await res.json()
            if (data.grid) {
                setCalendarData(data.grid)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchCalendar()
    }, [currentDate])

    const days = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate)
    })

    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <h2 className="text-xl font-bold min-w-[200px] text-center">
                            {format(currentDate, "MMMM yyyy", { locale: tr })}
                        </h2>
                        <Button variant="outline" size="icon" onClick={handleNextMonth}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-gray-500 font-normal">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                        Dolu/Bloke
                    </Badge>
                    <Badge variant="outline" className="text-gray-500 font-normal">
                        <div className="w-2 h-2 rounded-full bg-purple-500 mr-2" />
                        Özel Fiyat
                    </Badge>
                </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                {isLoading ? (
                    <div className="p-20 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
                    </div>
                ) : (
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="p-4 text-left min-w-[200px] sticky left-0 bg-gray-50/95 z-10 border-r border-b font-semibold text-gray-700">
                                    Oda Tipi
                                </th>
                                {days.map(day => {
                                    const isWeekend = getDay(day) === 0 || getDay(day) === 6
                                    return (
                                        <th key={day.toString()} className={`p-2 text-center border-b min-w-[80px] text-sm font-medium ${isWeekend ? 'text-red-500 bg-red-50/30' : 'text-gray-600'}`}>
                                            <div>{format(day, "d")}</div>
                                            <div className="text-xs opacity-70">{format(day, "EEE", { locale: tr })}</div>
                                        </th>
                                    )
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {calendarData.map(room => (
                                <tr key={room.id} className="hover:bg-gray-50/30 transition-colors group">
                                    <td className="p-4 sticky left-0 bg-white z-10 border-r border-b group-hover:bg-gray-50/30">
                                        <div className="font-medium text-gray-900">{room.name}</div>
                                        <button
                                            onClick={() => setActiveRuleDialog(room.id)}
                                            className="text-xs text-blue-600 hover:underline mt-1 flex items-center gap-1"
                                        >
                                            <Plus className="h-3 w-3" />
                                            Kural Ekle
                                        </button>
                                    </td>
                                    {room.data.map(cell => (
                                        <td
                                            key={cell.date}
                                            className={`
                                                p-2 border-b border-r border-gray-100 text-center relative cursor-pointer hover:bg-gray-100 transition-colors
                                                ${cell.isBlocked ? 'bg-red-50' : ''}
                                                ${cell.ruleName ? 'bg-purple-50/30' : ''}
                                            `}
                                            title={cell.ruleName || "Standart Fiyat"}
                                        >
                                            <div className={`font-mono text-sm ${cell.ruleName ? 'text-purple-700 font-semibold' : 'text-gray-700'}`}>
                                                {cell.price}₺
                                            </div>
                                            {!cell.isBlocked && (
                                                <div className="text-[10px] text-gray-400 mt-1">
                                                    {cell.stock} Stok
                                                </div>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {activeRuleDialog && (
                <PriceRuleDialog
                    isOpen={!!activeRuleDialog}
                    onClose={() => setActiveRuleDialog(null)}
                    roomTypeId={activeRuleDialog}
                    onSuccess={() => {
                        fetchCalendar()
                        // Maybe toast success
                    }}
                />
            )}
        </div>
    )
}
