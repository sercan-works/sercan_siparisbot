"use client"

import { useState } from "react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type DatePreset = "today" | "week" | "month" | "custom"

interface DateRangeSelectorProps {
  preset: DatePreset
  startDate: Date | null
  endDate: Date | null
  onPresetChange: (preset: DatePreset) => void
  onDateChange: (startDate: Date | null, endDate: Date | null) => void
}

export default function DateRangeSelector({
  preset,
  startDate,
  endDate,
  onPresetChange,
  onDateChange
}: DateRangeSelectorProps) {
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)

  const presetOptions = [
    { value: "today" as DatePreset, label: "Bugün" },
    { value: "week" as DatePreset, label: "Son 7 Gün" },
    { value: "month" as DatePreset, label: "Son 30 Gün" },
    { value: "custom" as DatePreset, label: "Özel Tarih" }
  ]

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Preset Selector */}
      <div className="flex gap-2 flex-wrap">
        {presetOptions.map((option) => (
          <Button
            key={option.value}
            variant={preset === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              onPresetChange(option.value)
              if (option.value !== "custom") {
                // Reset custom dates when selecting preset
                onDateChange(null, null)
              }
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Custom Date Pickers */}
      {preset === "custom" && (
        <div className="flex gap-2 items-center">
          <Dialog open={startDateOpen} onOpenChange={setStartDateOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? (
                  format(startDate, "PPP", { locale: tr })
                ) : (
                  <span>Başlangıç Tarihi</span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate || undefined}
                onSelect={(date) => {
                  onDateChange(date ?? null, endDate)
                  setStartDateOpen(false)
                }}
                initialFocus
                locale={tr}
              />
            </DialogContent>
          </Dialog>

          <span className="text-sm text-gray-500">-</span>

          <Dialog open={endDateOpen} onOpenChange={setEndDateOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
                disabled={!startDate}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? (
                  format(endDate, "PPP", { locale: tr })
                ) : (
                  <span>Bitiş Tarihi</span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate || undefined}
                onSelect={(date) => {
                  const selectedDate = date ?? null
                  if (selectedDate && startDate && selectedDate < startDate) {
                    // If end date is before start date, swap them
                    onDateChange(selectedDate, startDate)
                  } else {
                    onDateChange(startDate, selectedDate)
                  }
                  setEndDateOpen(false)
                }}
                initialFocus
                disabled={(date) => startDate ? date < startDate : false}
                locale={tr}
              />
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  )
}

