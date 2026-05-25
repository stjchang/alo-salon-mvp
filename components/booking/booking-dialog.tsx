"use client";

import { BookingWizard } from "@/components/booking/booking-wizard";
import { useLanguage } from "@/components/providers/language-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BookingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedServiceId?: string;
};

export function BookingDialog({
  open,
  onOpenChange,
  preselectedServiceId,
}: BookingDialogProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,800px)] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("booking.dialog.title")}</DialogTitle>
          <DialogDescription>{t("booking.dialog.description")}</DialogDescription>
        </DialogHeader>
        <BookingWizard initialServiceId={preselectedServiceId} />
      </DialogContent>
    </Dialog>
  );
}
