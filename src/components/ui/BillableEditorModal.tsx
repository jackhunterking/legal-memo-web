'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import Colors from '@/lib/colors';
import {
  secondsToHoursRoundUp,
  formatDurationForBilling,
  formatCurrency,
  formatBillableHours,
  calculateBillableAmount,
} from '@/types';

interface BillableEditorModalProps {
  visible: boolean;
  onClose: () => void;
  meeting: {
    id: string;
    duration_seconds: number;
    is_billable: boolean;
    billable_hours: number | null;
    billable_amount: number | null;
  };
  hourlyRate: number | null;
  currencySymbol: string;
  onSave: (data: {
    isBillable: boolean;
    billableHours: number | null;
    billableAmount: number | null;
  }) => Promise<void>;
  isSaving: boolean;
  onNavigateToSettings: () => void;
}

export default function BillableEditorModal({
  visible,
  onClose,
  meeting,
  hourlyRate,
  currencySymbol,
  onSave,
  isSaving,
  onNavigateToSettings,
}: BillableEditorModalProps) {
  // Local state for editing
  const [hoursInput, setHoursInput] = useState('');
  const [minutesInput, setMinutesInput] = useState('');
  const [useDefaultRate, setUseDefaultRate] = useState(true);
  const [manualRateInput, setManualRateInput] = useState('');

  // Default hours from duration (rounded up to nearest minute)
  const defaultHours = secondsToHoursRoundUp(meeting.duration_seconds);

  // Initialize values when modal opens
  useEffect(() => {
    if (visible) {
      // Set hours and minutes - use saved value or default from duration
      const totalHours = meeting.billable_hours ?? defaultHours;
      if (totalHours > 0) {
        const h = Math.floor(totalHours);
        const m = Math.round((totalHours - h) * 60);
        setHoursInput(h.toString());
        setMinutesInput(m.toString());
      } else {
        setHoursInput('');
        setMinutesInput('');
      }

      // Default to using the profile's hourly rate
      setUseDefaultRate(true);
      // Pre-fill manual rate with default rate for convenience
      if (hourlyRate) {
        setManualRateInput(hourlyRate.toString());
      } else {
        setManualRateInput('');
      }
    }
  }, [visible, meeting.billable_hours, defaultHours, hourlyRate]);

  // Convert hours and minutes to decimal hours
  const getTotalHours = () => {
    const h = parseInt(hoursInput) || 0;
    const m = parseInt(minutesInput) || 0;
    return h + m / 60;
  };

  // Get current rate (either default or manual)
  const getCurrentRate = () => {
    if (useDefaultRate) {
      return hourlyRate || 0;
    }
    return parseFloat(manualRateInput) || 0;
  };

  // Handle hours change
  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setHoursInput(value);
  };

  // Handle minutes change
  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    // Limit to 0-59
    const numValue = parseInt(value) || 0;
    if (numValue > 59) {
      setMinutesInput('59');
    } else {
      setMinutesInput(value);
    }
  };

  // Handle manual rate change
  const handleManualRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setManualRateInput(value);
  };

  // Toggle between default and manual rate
  const handleRateToggle = (useDefault: boolean) => {
    setUseDefaultRate(useDefault);
    // When switching to manual, pre-fill with default rate if available
    if (!useDefault && hourlyRate && !manualRateInput) {
      setManualRateInput(hourlyRate.toString());
    }
  };

  // Handle save - amount is calculated from time × rate
  const handleSave = async () => {
    const totalHours = getTotalHours();
    const rate = getCurrentRate();
    const calculatedAmount = calculateBillableAmount(totalHours, rate);

    await onSave({
      isBillable: true, // Always true since modal is only opened when billable is enabled
      billableHours: totalHours > 0 ? totalHours : null,
      billableAmount: calculatedAmount,
    });
  };

  // Calculate display values
  const totalHours = getTotalHours();
  const currentRate = getCurrentRate();
  const calculatedAmount = calculateBillableAmount(totalHours, currentRate);
  const calculationText =
    currentRate > 0 && totalHours > 0
      ? `${formatBillableHours(totalHours)} × ${formatCurrency(currentRate, currencySymbol)}/hr`
      : null;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-[440px] flex flex-col max-h-[90vh] pointer-events-auto overflow-hidden"
              style={{
                backgroundColor: Colors.surface,
                borderRadius: 20,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-text">Edit Billing</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center hover:bg-border transition-colors"
                >
                  <X size={18} className="text-text-muted" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                {currentRate === 0 && (
                  <p className="text-text-muted text-sm text-center">
                    Set an hourly rate to calculate billing amount
                  </p>
                )}

                {/* Recorded Duration - Prominent Display */}
                <div
                  className="rounded-xl p-4 text-center border"
                  style={{
                    backgroundColor: Colors.surfaceLight,
                    borderColor: Colors.border,
                  }}
                >
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                    Recorded Duration
                  </p>
                  <p className="text-3xl font-bold text-text">
                    {formatDurationForBilling(meeting.duration_seconds)}
                  </p>
                </div>

                {/* Time Input - Hours and Minutes */}
                <div>
                  <p className="text-sm font-semibold text-text mb-3">Billable Time</p>
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex flex-col items-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={hoursInput}
                        onChange={handleHoursChange}
                        placeholder="0"
                        maxLength={3}
                        className="w-20 h-16 text-center text-2xl font-bold rounded-xl border bg-surface-light text-text placeholder:text-text-muted focus:outline-none focus:border-accent-light transition-colors"
                        style={{ borderColor: Colors.border }}
                      />
                      <span className="text-xs text-text-muted mt-2">hours</span>
                    </div>
                    <span className="text-2xl font-bold text-text-muted">:</span>
                    <div className="flex flex-col items-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={minutesInput}
                        onChange={handleMinutesChange}
                        placeholder="0"
                        maxLength={2}
                        className="w-20 h-16 text-center text-2xl font-bold rounded-xl border bg-surface-light text-text placeholder:text-text-muted focus:outline-none focus:border-accent-light transition-colors"
                        style={{ borderColor: Colors.border }}
                      />
                      <span className="text-xs text-text-muted mt-2">minutes</span>
                    </div>
                  </div>
                </div>

                {/* Hourly Rate Section */}
                <div>
                  <p className="text-sm font-semibold text-text mb-3">Hourly Rate</p>

                  {/* Rate Option Tabs */}
                  <div
                    className="flex rounded-xl overflow-hidden border mb-3"
                    style={{ borderColor: Colors.border }}
                  >
                    <button
                      onClick={() => handleRateToggle(true)}
                      className={`flex-1 py-3 font-semibold text-sm transition-colors ${
                        useDefaultRate
                          ? 'bg-accent-light text-white'
                          : 'bg-surface-light text-text-muted hover:text-text'
                      }`}
                    >
                      Default
                    </button>
                    <button
                      onClick={() => handleRateToggle(false)}
                      className={`flex-1 py-3 font-semibold text-sm transition-colors ${
                        !useDefaultRate
                          ? 'bg-accent-light text-white'
                          : 'bg-surface-light text-text-muted hover:text-text'
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {/* Default Rate Display */}
                  {useDefaultRate && (
                    <div
                      className="rounded-xl p-4 text-center border"
                      style={{
                        backgroundColor: Colors.surfaceLight,
                        borderColor: Colors.border,
                      }}
                    >
                      {hourlyRate ? (
                        <p className="text-xl font-bold text-success">
                          {formatCurrency(hourlyRate, currencySymbol)}/hr
                        </p>
                      ) : (
                        <button
                          onClick={() => {
                            onClose();
                            onNavigateToSettings();
                          }}
                          className="flex items-center justify-center gap-1 text-accent-light font-semibold"
                        >
                          Set Default Hourly Rate
                          <ChevronRight size={18} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Manual Rate Input */}
                  {!useDefaultRate && (
                    <div
                      className="flex items-center rounded-xl border px-4"
                      style={{
                        backgroundColor: Colors.surfaceLight,
                        borderColor: Colors.border,
                      }}
                    >
                      <span className="text-lg font-semibold text-text-muted">
                        {currencySymbol}
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={manualRateInput}
                        onChange={handleManualRateChange}
                        placeholder="0.00"
                        className="flex-1 h-14 text-center text-xl font-bold bg-transparent text-text placeholder:text-text-muted focus:outline-none"
                      />
                      <span className="text-lg font-semibold text-text-muted">/hr</span>
                    </div>
                  )}
                </div>

                {/* Preview Card - Auto-calculated (only show when rate is set) */}
                {totalHours > 0 && calculatedAmount && calculatedAmount > 0 && (
                  <div
                    className="rounded-xl p-4 text-center border"
                    style={{
                      backgroundColor: `${Colors.success}15`,
                      borderColor: `${Colors.success}40`,
                    }}
                  >
                    <p className="text-xs font-semibold text-success uppercase tracking-wider mb-1">
                      Total Amount
                    </p>
                    <p className="text-3xl font-bold text-success">
                      {formatCurrency(calculatedAmount, currencySymbol)}
                    </p>
                    {calculationText && (
                      <p className="text-sm text-text-muted mt-1">{calculationText}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Footer - Save Button */}
              <div className="px-5 py-4 border-t border-border">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`w-full py-3.5 rounded-xl font-semibold transition-colors ${
                    isSaving
                      ? 'bg-surface-light text-text-muted cursor-not-allowed'
                      : 'bg-accent-light text-white hover:bg-accent-light/90'
                  }`}
                >
                  {isSaving ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </div>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

