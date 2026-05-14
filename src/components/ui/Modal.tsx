import React from 'react';
import { motion } from 'motion/react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ title, onClose, children, footer }: ModalProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 modal-backdrop flex items-center justify-center p-3.5 z-50"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: 50, scale: 0.95, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 20, scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="w-full max-w-[640px] bg-[var(--panel)] border border-[var(--line)] rounded-[18px] shadow-[var(--shadow)] overflow-hidden flex flex-col max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3.5 border-b border-[color-mix(in_srgb,var(--line)_85%,transparent)] flex items-center justify-between gap-2.5">
          <b className="text-[13px]">{title}</b>
          <button className="text-xs hover:text-red-500" onClick={onClose}>关闭</button>
        </div>
        <div className="p-3.5 overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="p-3.5 border-t border-[color-mix(in_srgb,var(--line)_85%,transparent)] flex justify-end gap-2.5 flex-wrap">
            {footer}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
