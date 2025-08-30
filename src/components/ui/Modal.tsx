import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cva, type VariantProps } from 'class-variance-authority';

const modalVariants = cva(
  'relative bg-white rounded-xl shadow-lg transition-all duration-200 transform',
  {
    variants: {
      size: {
        xs: 'max-w-sm',
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-7xl',
      },
      variant: {
        default: 'border border-gray-200',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  }
);

interface IModalProps extends VariantProps<typeof modalVariants> {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  preventClose?: boolean;
}

export const Modal = React.memo<IModalProps>(({
  isOpen,
  onClose,
  children,
  size,
  variant,
  className,
  closeOnOverlayClick = true,
  showCloseButton = true,
  preventClose = false,
}) => {
  const handleClose = () => {
    if (!preventClose) {
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog 
        as="div" 
        className="relative z-50" 
        onClose={closeOnOverlayClick ? handleClose : () => {}}
      >
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/50" />
        </Transition.Child>

        {/* Modal Container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel 
                className={modalVariants({ size, variant, className })}
              >
                {/* Close Button */}
                {showCloseButton && !preventClose && (
                  <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors duration-150 z-10"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
                
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
});

Modal.displayName = 'Modal';

// Modal sub-components
interface IModalHeaderProps {
  children: React.ReactNode;
  className?: string;
  withCloseButton?: boolean;
}

export const ModalHeader = React.memo<IModalHeaderProps>(({ 
  children, 
  className = '',
  withCloseButton = true
}) => (
  <div className={`p-6 ${withCloseButton ? 'pr-12' : ''} border-b border-gray-200 ${className}`}>
    {children}
  </div>
));

ModalHeader.displayName = 'ModalHeader';

interface IModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalBody = React.memo<IModalBodyProps>(({ 
  children, 
  className = '' 
}) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
));

ModalBody.displayName = 'ModalBody';

interface IModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalFooter = React.memo<IModalFooterProps>(({ 
  children, 
  className = '' 
}) => (
  <div className={`flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl ${className}`}>
    {children}
  </div>
));

ModalFooter.displayName = 'ModalFooter';

// Confirmation Modal - Common pattern
interface IConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const ConfirmationModal = React.memo<IConfirmationModalProps>(({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  loading = false,
}) => {
  const variantStyles = {
    danger: {
      icon: '🚨',
      confirmVariant: 'danger' as const,
    },
    warning: {
      icon: '⚠️',
      confirmVariant: 'warning' as const,
    },
    info: {
      icon: 'ℹ️',
      confirmVariant: 'primary' as const,
    },
  };

  const style = variantStyles[variant];

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="sm"
      preventClose={loading}
    >
      <ModalHeader>
        <div className="text-center">
          <div className="text-4xl mb-4">{style.icon}</div>
          <Dialog.Title className="text-xl font-semibold text-gray-900">
            {title}
          </Dialog.Title>
          <p className="mt-2 text-sm text-gray-600">
            {description}
          </p>
        </div>
      </ModalHeader>
      
      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors duration-150 disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150 disabled:opacity-50 ${
            style.confirmVariant === 'danger'
              ? 'bg-error-500 hover:bg-error-600 text-white'
              : style.confirmVariant === 'warning'
              ? 'bg-warning-500 hover:bg-warning-600 text-white'
              : 'bg-primary-500 hover:bg-primary-600 text-white'
          }`}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            confirmText
          )}
        </button>
      </ModalFooter>
    </Modal>
  );
});

ConfirmationModal.displayName = 'ConfirmationModal';