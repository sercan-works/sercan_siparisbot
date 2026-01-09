"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface DeleteKBDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  knowledgeBaseName: string
  isDeleting?: boolean
}

export default function DeleteKBDialog({
  isOpen,
  onClose,
  onConfirm,
  knowledgeBaseName,
  isDeleting = false
}: DeleteKBDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <DialogTitle>Bilgi Bankasını Sil</DialogTitle>
          </div>
          <DialogDescription className="pt-4">
            <span className="font-semibold text-gray-900">"{knowledgeBaseName}"</span> bilgi bankasını silmek istediğinizden emin misiniz?
            <br /><br />
            Bu işlem geri alınamaz ve bilgi bankası tüm botlardan kaldırılacaktır.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            İptal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Siliniyor..." : "Sil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

