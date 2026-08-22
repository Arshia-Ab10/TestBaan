"use client";
import React, { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: "alert" | "confirm";
  variant?: "danger" | "warning" | "info" | "success";
  confirmText?: string;
  cancelText?: string;
}

export default function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = "alert",
  variant = "info",
  confirmText = "متوجه شدم",
  cancelText = "انصراف",
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case "danger":
        return (
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center text-2xl mx-auto mb-4 border border-red-200 dark:border-red-800 shadow-inner">
            🗑️
          </div>
        );
      case "warning":
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl mx-auto mb-4 border border-amber-200 dark:border-amber-800 shadow-inner">
            ⚠️
          </div>
        );
      case "success":
        return (
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mx-auto mb-4 border border-emerald-200 dark:border-emerald-800 shadow-inner">
            ✅
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl mx-auto mb-4 border border-blue-200 dark:border-blue-800 shadow-inner">
            ℹ️
          </div>
        );
    }
  };

  const getConfirmBtnClass = () => {
    switch (variant) {
      case "danger":
        return "bg-red-600 hover:bg-red-700 text-white shadow-red-500/20";
      case "warning":
        return "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20";
      case "success":
        return "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20";
      default:
        return "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl scale-100 transition-transform">
        {getIcon()}
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6 font-medium whitespace-pre-line">
          {message}
        </p>

        <div className="flex gap-3">
          {type === "confirm" && (
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-3 rounded-xl font-bold text-sm transition"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={() => {
              if (onConfirm) onConfirm();
              onClose();
            }}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition shadow-lg ${getConfirmBtnClass()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}