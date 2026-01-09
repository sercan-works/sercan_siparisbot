"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PriceRuleDialogProps {
    isOpen: boolean
    onClose: () => void
    roomTypeId: string
    onSuccess: () => void
}

const DAYS = [
    { label: "Paz", value: 0 },
    { label: "Pzt", value: 1 },
    { label: "Sal", value: 2 },
    { label: "Çar", value: 3 },
    { label: "Per", value: 4 },
    { label: "Cum", value: 5 },
    { label: "Cmt", value: 6 },
]

export function PriceRuleDialog({ isOpen, onClose, roomTypeId, onSuccess }: PriceRuleDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        type: "PERCENTAGE", // PERCENTAGE, FIXED_AMOUNT, FIXED_PRICE
        value: 0,
        startDate: "",
        endDate: "",
        daysOfWeek: [] as number[],
        priority: 1
    })

    const toggleDay = (day: number) => {
        setFormData(prev => {
            if (prev.daysOfWeek.includes(day)) {
                return { ...prev, daysOfWeek: prev.daysOfWeek.filter(d => d !== day) }
            } else {
                return { ...prev, daysOfWeek: [...prev.daysOfWeek, day] }
            }
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const response = await fetch("/api/rooms/rules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roomTypeId,
                    name: formData.name,
                    priceAdjustmentType: formData.type,
                    adjustmentValue: formData.value,
                    startDate: formData.startDate || null,
                    endDate: formData.endDate || null,
                    daysOfWeek: formData.daysOfWeek,
                    priority: formData.priority
                })
            })

            if (!response.ok) throw new Error("Failed")

            onSuccess()
            onClose()
            setFormData({
                name: "",
                type: "PERCENTAGE",
                value: 0,
                startDate: "",
                endDate: "",
                daysOfWeek: [],
                priority: 1
            })
        } catch (error) {
            alert("Kural oluşturulamadı")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Yeni Fiyat Kuralı Ekle</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Kural Adı</Label>
                        <Input
                            placeholder="Örn: Yaz Sezonu"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>İşlem Tipi</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(v) => setFormData({ ...formData, type: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PERCENTAGE">Yüzde (%) Artış</SelectItem>
                                    <SelectItem value="FIXED_AMOUNT">Sabit Tutar (+) Ekle</SelectItem>
                                    <SelectItem value="FIXED_PRICE">Fiyatı Sabitle (=)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Değer</Label>
                            <Input
                                type="number"
                                value={formData.value}
                                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Başlangıç Tarihi (Opsiyonel)</Label>
                            <Input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Bitiş Tarihi (Opsiyonel)</Label>
                            <Input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Geçerli Günler (Opsiyonel)</Label>
                        <div className="flex flex-wrap gap-2">
                            {DAYS.map(day => (
                                <div
                                    key={day.value}
                                    onClick={() => toggleDay(day.value)}
                                    className={`cursor-pointer px-3 py-1 rounded-md border text-sm transition-colors ${formData.daysOfWeek.includes(day.value)
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "bg-white border-gray-200 hover:bg-gray-50"
                                        }`}
                                >
                                    {day.label}
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400">Seçim yapılmazsa her gün geçerli olur.</p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Kaydediliyor..." : "Oluştur"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
